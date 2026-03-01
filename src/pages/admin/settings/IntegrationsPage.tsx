import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Loader2, PlugZap } from "lucide-react";
import type { PostgrestError } from "@supabase/supabase-js";

type IntegrationStatus = "not_configured" | "connected" | "error";
type AuthMode = "api_key" | "password";
type SyncDirection = "import_only" | "export_only" | "two_way";
type ConflictPolicy = "prefer_odoo" | "prefer_optilens" | "manual_review";

interface IntegrationConnection {
  id: string;
  tenant_key: string;
  provider: "odoo";
  environment: string;
  base_url: string;
  database_name: string;
  user_identifier: string | null;
  auth_mode: AuthMode;
  status: IntegrationStatus;
  sync_direction: SyncDirection;
  conflict_policy: ConflictPolicy;
  incremental_enabled: boolean;
  dry_run_enabled: boolean;
  last_health_check_at: string | null;
  last_sync_cursor_at: string | null;
  last_sync_import_count: number;
  last_sync_export_count: number;
  last_sync_failure_count: number;
  retry_state: string | null;
  updated_at: string;
}

interface IntegrationHealthMetric {
  integration_connection_id: string;
  tenant_key: string;
  provider: string;
  last_successful_run_at: string | null;
  lag_behind_source_seconds: number;
  error_rate: number;
  records_processed_per_run: number;
}

interface IntegrationSyncJob {
  id: string;
  sync_kind: "initial" | "incremental";
  status: "queued" | "running" | "success" | "failed";
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface IntegrationSyncJobRow extends IntegrationSyncJob {
  integration_connection_id: string;
}

interface IntegrationStructuredLog {
  id: string;
  event_name: string;
  log_level: "debug" | "info" | "warn" | "error";
  redacted_payload: Record<string, unknown> | null;
  created_at: string;
}

type SyncErrorStatus = "open" | "retry_queued" | "resolved" | "ignored";

interface IntegrationSyncError {
  id: string;
  integration_connection_id: string;
  source_model: string;
  source_identifier: string;
  error_code: string | null;
  error_message: string;
  status: SyncErrorStatus;
  retry_count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
}

const fmt = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : "—";

const statusMeta: Record<IntegrationStatus, { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  error: { label: "Error", className: "bg-red-500/10 text-red-700 border-red-300" },
  not_configured: { label: "Not configured", className: "bg-slate-500/10 text-slate-700 border-slate-300" },
};

export default function IntegrationsPage() {
  const { realRole, isLoading: roleLoading } = useAdminRole();
  const isAdmin = realRole === "admin";
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["integration-connection", "odoo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .select("*")
        .eq("provider", "odoo")
        .eq("tenant_key", "default")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as IntegrationConnection | null;
    },
    enabled: isAdmin,
  });

  const { data: healthMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["integration-health-metrics", "odoo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_health_metrics_dashboard" as never)
        .select("*")
        .eq("provider", "odoo")
        .eq("tenant_key", "default");
      if (error) throw error;
      return (data ?? []) as IntegrationHealthMetric[];
    },
    enabled: isAdmin,
  });

  const { data: latestSyncJob, isLoading: latestSyncJobLoading } = useQuery({
    queryKey: ["integration-latest-sync-job", data?.id],
    queryFn: async () => {
      if (!data?.id) return null as IntegrationSyncJob | null;
      const { data: rows, error } = await supabase
        .from("integration_sync_jobs" as never)
        .select("id,sync_kind,status,requested_at,started_at,completed_at,error_message")
        .eq("integration_connection_id", data.id)
        .order("requested_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((rows ?? [])[0] ?? null) as IntegrationSyncJob | null;
    },
    enabled: isAdmin && !!data?.id,
  });

  const { data: recentSyncJobs = [], isLoading: recentSyncJobsLoading } = useQuery({
    queryKey: ["integration-recent-sync-jobs", data?.id],
    queryFn: async () => {
      if (!data?.id) return [] as IntegrationSyncJobRow[];
      const { data: rows, error } = await supabase
        .from("integration_sync_jobs" as never)
        .select("id,integration_connection_id,sync_kind,status,requested_at,started_at,completed_at,error_message")
        .eq("integration_connection_id", data.id)
        .order("requested_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (rows ?? []) as IntegrationSyncJobRow[];
    },
    enabled: isAdmin && !!data?.id,
  });

  const { data: odooErrorLogs = [], isLoading: odooErrorLogsLoading } = useQuery({
    queryKey: ["integration-odoo-error-logs", data?.id],
    queryFn: async () => {
      if (!data?.id) return [] as IntegrationStructuredLog[];
      const { data: rows, error } = await supabase
        .from("integration_structured_logs" as never)
        .select("id,event_name,log_level,redacted_payload,created_at")
        .eq("integration_connection_id", data.id)
        .eq("provider", "odoo")
        .eq("log_level", "error")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (rows ?? []) as IntegrationStructuredLog[];
    },
    enabled: isAdmin && !!data?.id,
  });

  const [syncErrorStatusFilter, setSyncErrorStatusFilter] = useState<"all" | SyncErrorStatus>("open");

  const { data: syncErrors = [], isLoading: syncErrorsLoading } = useQuery({
    queryKey: ["integration-sync-errors", data?.id, syncErrorStatusFilter],
    queryFn: async () => {
      if (!data?.id) return [] as IntegrationSyncError[];
      let query = supabase
        .from("integration_sync_errors" as never)
        .select("id,integration_connection_id,source_model,source_identifier,error_code,error_message,status,retry_count,first_seen_at,last_seen_at,resolved_at")
        .eq("integration_connection_id", data.id)
        .order("last_seen_at", { ascending: false })
        .limit(100);

      if (syncErrorStatusFilter !== "all") {
        query = query.eq("status", syncErrorStatusFilter);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      return (rows ?? []) as IntegrationSyncError[];
    },
    enabled: isAdmin && !!data?.id,
  });

  const [connectionForm, setConnectionForm] = useState({
    environment: "production",
    base_url: "",
    database_name: "",
    user_identifier: "",
    auth_mode: "password" as AuthMode,
  });
  const [credential, setCredential] = useState("");

  const [syncForm, setSyncForm] = useState({
    sync_direction: "import_only" as SyncDirection,
    conflict_policy: "prefer_odoo" as ConflictPolicy,
    incremental_enabled: true,
    dry_run_enabled: false,
  });

  useEffect(() => {
    if (!data) return;
    setConnectionForm({
      environment: data.environment,
      base_url: data.base_url,
      database_name: data.database_name,
      user_identifier: data.user_identifier ?? "",
      auth_mode: data.auth_mode,
    });
    setSyncForm({
      sync_direction: data.sync_direction,
      conflict_policy: data.conflict_policy,
      incremental_enabled: data.incremental_enabled,
      dry_run_enabled: data.dry_run_enabled,
    });
  }, [data]);

  const upsertMutation = useMutation({
    mutationFn: async (testConnection: boolean) => {
      const payload = {
        p_tenant_key: "default",
        p_provider: "odoo",
        p_environment: connectionForm.environment,
        p_base_url: connectionForm.base_url,
        p_database_name: connectionForm.database_name,
        p_user_identifier: connectionForm.user_identifier || null,
        p_auth_mode: connectionForm.auth_mode,
        p_sync_direction: syncForm.sync_direction,
        p_conflict_policy: syncForm.conflict_policy,
        p_incremental_enabled: syncForm.incremental_enabled,
        p_dry_run_enabled: syncForm.dry_run_enabled,
        p_credential_value: credential || null,
        p_test_connection: testConnection,
      };

      const rpcAttempts: Array<{ fn: string; args: Record<string, unknown> }> = [
        { fn: "upsert_integration_connection", args: payload },
        { fn: "upsert_integration_connection_with_secret", args: payload },
        {
          fn: "upsert_integration_connection_with_secret",
          args: {
            ...payload,
            p_test_connection: undefined,
          },
        },
      ];

      let lastError: PostgrestError | null = null;
      for (const attempt of rpcAttempts) {
        const { error } = await supabase.rpc(attempt.fn as never, attempt.args as never);
        if (!error) return;
        lastError = error;

        const isMissingFunctionError = /Could not find the function/i.test(error.message);
        if (!isMissingFunctionError) {
          throw error;
        }
      }

      if (lastError) throw lastError;
      throw new Error("Integration upsert failed without an explicit error.");
    },
    onSuccess: (_, testConnection) => {
      qc.invalidateQueries({ queryKey: ["integration-connection", "odoo"] });
      qc.invalidateQueries({ queryKey: ["integration-odoo-error-logs"] });
      qc.invalidateQueries({ queryKey: ["integration-health-metrics", "odoo"] });
      setCredential("");
      toast({
        title: testConnection ? "Connection tested" : "Integration saved",
        description: testConnection
          ? "Credentials were saved and a health check was recorded."
          : "Integration settings updated.",
      });
    },
    onError: (error: PostgrestError) => {
      toast({ title: "Unable to save integration", description: error.message, variant: "destructive" });
    },
  });

  const triggerSyncMutation = useMutation({
    mutationFn: async (syncKind: "initial" | "incremental") => {
      const { error } = await supabase.rpc("trigger_integration_sync_job" as never, {
        p_tenant_key: "default",
        p_provider: "odoo",
        p_sync_kind: syncKind,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_, syncKind) => {
      qc.invalidateQueries({ queryKey: ["integration-connection", "odoo"] });
      qc.invalidateQueries({ queryKey: ["integration-health-metrics", "odoo"] });
      toast({
        title: "Sync queued",
        description: syncKind === "initial" ? "Initial import was queued." : "Incremental sync was queued.",
      });
    },
    onError: (error: PostgrestError) => {
      toast({ title: "Unable to queue sync", description: error.message, variant: "destructive" });
    },
  });

  const cancelSyncJobMutation = useMutation({
    mutationFn: async (syncJobId: string) => {
      const { error } = await supabase.rpc("cancel_integration_sync_job" as never, {
        p_sync_job_id: syncJobId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-recent-sync-jobs"] });
      qc.invalidateQueries({ queryKey: ["integration-latest-sync-job"] });
      qc.invalidateQueries({ queryKey: ["integration-connection", "odoo"] });
      toast({ title: "Sync job canceled", description: "Queued sync job was canceled before execution." });
    },
    onError: (error: PostgrestError) => {
      toast({ title: "Unable to cancel sync job", description: error.message, variant: "destructive" });
    },
  });

  const manageSyncErrorMutation = useMutation({
    mutationFn: async ({ errorId, action }: { errorId: string; action: "retry" | "resolve" | "ignore" }) => {
      const { error } = await supabase.rpc("manage_integration_sync_error" as never, {
        p_error_id: errorId,
        p_action: action,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["integration-sync-errors"] });
      qc.invalidateQueries({ queryKey: ["integration-connection", "odoo"] });
      toast({
        title: "Sync error updated",
        description: `Marked error as ${vars.action === "resolve" ? "resolved" : vars.action === "retry" ? "retry queued" : "ignored"}.`,
      });
    },
    onError: (error: PostgrestError) => {
      toast({ title: "Unable to update sync error", description: error.message, variant: "destructive" });
    },
  });

  const currentStatus = useMemo<IntegrationStatus>(() => data?.status ?? "not_configured", [data]);
  const syncProgress = useMemo(() => {
    if (!latestSyncJob) return { percent: 0, label: "No sync job has run yet." };

    if (latestSyncJob.status === "queued") {
      return { percent: 15, label: `Queued ${latestSyncJob.sync_kind} sync.` };
    }

    if (latestSyncJob.status === "running") {
      return { percent: 65, label: `Running ${latestSyncJob.sync_kind} sync…` };
    }

    if (latestSyncJob.status === "failed") {
      return { percent: 100, label: `Last sync failed${latestSyncJob.error_message ? `: ${latestSyncJob.error_message}` : "."}` };
    }

    return { percent: 100, label: `Last ${latestSyncJob.sync_kind} sync completed successfully.` };
  }, [latestSyncJob]);


  if (roleLoading || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Only admin users can view or update integration credentials.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const requiresCredential = !data || data.status !== "connected";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Odoo Integration</h1>
          <p className="text-sm text-muted-foreground">Manage connection, sync behavior, and diagnostics for tenant: default.</p>
        </div>
        <Badge variant="outline" className={statusMeta[currentStatus].className}>{statusMeta[currentStatus].label}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection setup</CardTitle>
          <CardDescription>Configure endpoint metadata used to establish an Odoo session.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Odoo Environment</Label>
            <Select value={connectionForm.environment} onValueChange={(value) => setConnectionForm((p) => ({ ...p, environment: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="sandbox">Sandbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Auth method</Label>
            <Select value={connectionForm.auth_mode} onValueChange={(value: AuthMode) => setConnectionForm((p) => ({ ...p, auth_mode: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="password">Password</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Odoo URL</Label>
            <Input value={connectionForm.base_url} onChange={(e) => setConnectionForm((p) => ({ ...p, base_url: e.target.value }))} placeholder="https://odoo.example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Database</Label>
            <Input value={connectionForm.database_name} onChange={(e) => setConnectionForm((p) => ({ ...p, database_name: e.target.value }))} placeholder="odoo_db" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>User identifier (email/login)</Label>
            <Input value={connectionForm.user_identifier} onChange={(e) => setConnectionForm((p) => ({ ...p, user_identifier: e.target.value }))} placeholder="integration-bot@company.com" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credentials & connection test</CardTitle>
          <CardDescription>
            Credentials are stored encrypted server-side and are never returned to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>{connectionForm.auth_mode === "api_key" ? "API key" : "Password"}</Label>
            <Input type="password" value={credential} onChange={(e) => setCredential(e.target.value)} placeholder={requiresCredential ? "Required to save" : "Leave empty to keep existing secret"} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => upsertMutation.mutate(false)} disabled={upsertMutation.isPending || (!credential && requiresCredential)}>
              {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save configuration
            </Button>
            <Button variant="outline" onClick={() => upsertMutation.mutate(true)} disabled={upsertMutation.isPending || (!credential && requiresCredential)}>
              <PlugZap className="mr-2 h-4 w-4" />Test connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync controls</CardTitle>
          <CardDescription>Control import/export direction, conflict policy, and manual sync runs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Direction mode</Label>
            <Select value={syncForm.sync_direction} onValueChange={(value: SyncDirection) => setSyncForm((p) => ({ ...p, sync_direction: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="import_only">Import only</SelectItem>
                <SelectItem value="export_only">Export only</SelectItem>
                <SelectItem value="two_way">Two-way</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Conflict policy</Label>
            <Select value={syncForm.conflict_policy} onValueChange={(value: ConflictPolicy) => setSyncForm((p) => ({ ...p, conflict_policy: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prefer_odoo">Prefer Odoo</SelectItem>
                <SelectItem value="prefer_optilens">Prefer OptiLens</SelectItem>
                <SelectItem value="manual_review">Manual review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={syncForm.incremental_enabled} onChange={(e) => setSyncForm((p) => ({ ...p, incremental_enabled: e.target.checked }))} />
            Enable incremental sync
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={syncForm.dry_run_enabled} onChange={(e) => setSyncForm((p) => ({ ...p, dry_run_enabled: e.target.checked }))} />
            Dry-run mode
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => triggerSyncMutation.mutate("initial")} disabled={triggerSyncMutation.isPending}>Initial import</Button>
            <Button variant="outline" onClick={() => triggerSyncMutation.mutate("incremental")} disabled={triggerSyncMutation.isPending}>Incremental sync</Button>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Sync progress</span>
              <span>{syncProgress.percent}%</span>
            </div>
            <Progress value={syncProgress.percent} aria-label="Integration sync progress" />
            <p className="text-xs text-muted-foreground">{latestSyncJobLoading ? "Loading latest sync status…" : syncProgress.label}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration health metrics</CardTitle>
          <CardDescription>Tracks last successful run, lag behind source, error rate, and records processed per run.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Last successful run</th>
                  <th className="px-3 py-2 font-medium">Lag behind source</th>
                  <th className="px-3 py-2 font-medium">Error rate</th>
                  <th className="px-3 py-2 font-medium">Records / run</th>
                </tr>
              </thead>
              <tbody>
                {metricsLoading && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={4}>Loading integration metrics…</td>
                  </tr>
                )}
                {!metricsLoading && (healthMetrics?.length ?? 0) === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={4}>No sync metrics available yet.</td>
                  </tr>
                )}
                {(healthMetrics ?? []).map((metric) => (
                  <tr key={metric.integration_connection_id} className="border-t">
                    <td className="px-3 py-2">{fmt(metric.last_successful_run_at)}</td>
                    <td className="px-3 py-2">{Math.max(metric.lag_behind_source_seconds ?? 0, 0)}s</td>
                    <td className="px-3 py-2">{((metric.error_rate ?? 0) * 100).toFixed(2)}%</td>
                    <td className="px-3 py-2">{(metric.records_processed_per_run ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last sync diagnostics</CardTitle>
          <CardDescription>Monitor cursors, counters, failures, and retry state from the most recent run.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div>Cursor timestamp: <strong>{fmt(data?.last_sync_cursor_at)}</strong></div>
          <div>Last health check: <strong>{fmt(data?.last_health_check_at)}</strong></div>
          <div>Imported count: <strong>{data?.last_sync_import_count ?? 0}</strong></div>
          <div>Exported count: <strong>{data?.last_sync_export_count ?? 0}</strong></div>
          <div>Failures: <strong>{data?.last_sync_failure_count ?? 0}</strong></div>
          <div>Retry state: <strong>{data?.retry_state ?? "idle"}</strong></div>
          <div className="md:col-span-2 flex items-center gap-2 text-muted-foreground">
            {currentStatus === "connected" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
            {currentStatus === "connected" ? "Connection healthy." : "Connection requires attention."}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queued and recent sync tasks</CardTitle>
          <CardDescription>Track queued/running/success/failed jobs and cancel tasks that are still queued.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Requested</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Error</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSyncJobsLoading && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={5}>Loading sync tasks…</td>
                  </tr>
                )}
                {!recentSyncJobsLoading && recentSyncJobs.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={5}>No sync tasks found.</td>
                  </tr>
                )}
                {recentSyncJobs.map((job) => (
                  <tr key={job.id} className="border-t">
                    <td className="px-3 py-2">{fmt(job.requested_at)}</td>
                    <td className="px-3 py-2 capitalize">{job.sync_kind}</td>
                    <td className="px-3 py-2 capitalize">{job.status}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{job.error_message ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {job.status === "queued" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelSyncJobMutation.mutate(job.id)}
                          disabled={cancelSyncJobMutation.isPending}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Odoo error log</CardTitle>
          <CardDescription>Troubleshoot Odoo-side exceptions captured in structured logs (redacted payload).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {odooErrorLogsLoading ? (
            <p className="text-sm text-muted-foreground">Loading Odoo error logs…</p>
          ) : odooErrorLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Odoo error logs recorded yet.</p>
          ) : (
            odooErrorLogs.map((entry) => (
              <div key={entry.id} className="rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{entry.event_name}</span>
                  <span className="text-xs text-muted-foreground">{fmt(entry.created_at)}</span>
                </div>
                <pre className="mt-1 overflow-x-auto text-[11px] text-muted-foreground">{JSON.stringify(entry.redacted_payload ?? {}, null, 2)}</pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Sync error management</CardTitle>
              <CardDescription>Review sync failures and quickly retry, resolve, or ignore records from this tenant.</CardDescription>
            </div>
            <Select value={syncErrorStatusFilter} onValueChange={(value: "all" | SyncErrorStatus) => setSyncErrorStatusFilter(value)}>
              <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="retry_queued">Retry queued</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Error</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Retries</th>
                  <th className="px-3 py-2 font-medium">Last seen</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {syncErrorsLoading && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={6}>Loading sync errors…</td>
                  </tr>
                )}
                {!syncErrorsLoading && syncErrors.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={6}>No sync errors found for this filter.</td>
                  </tr>
                )}
                {syncErrors.map((syncError) => (
                  <tr key={syncError.id} className="border-t align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{syncError.source_model}</div>
                      <div className="text-xs text-muted-foreground">{syncError.source_identifier}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{syncError.error_message}</div>
                      {syncError.error_code ? <div className="text-xs text-muted-foreground">Code: {syncError.error_code}</div> : null}
                    </td>
                    <td className="px-3 py-2 capitalize">{syncError.status.replace("_", " ")}</td>
                    <td className="px-3 py-2">{syncError.retry_count}</td>
                    <td className="px-3 py-2">{fmt(syncError.last_seen_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => manageSyncErrorMutation.mutate({ errorId: syncError.id, action: "retry" })}
                          disabled={manageSyncErrorMutation.isPending}
                        >
                          Retry
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => manageSyncErrorMutation.mutate({ errorId: syncError.id, action: "resolve" })}
                          disabled={manageSyncErrorMutation.isPending}
                        >
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => manageSyncErrorMutation.mutate({ errorId: syncError.id, action: "ignore" })}
                          disabled={manageSyncErrorMutation.isPending}
                        >
                          Ignore
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
