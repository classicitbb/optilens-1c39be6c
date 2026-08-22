import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Database, Loader2, PlugZap, RefreshCw } from "lucide-react";

// Live status for the outbound Innovations → cloud sync (OptiLens Local pushes;
// this card reads what landed). Source of truth: public.innovations_sync_runs +
// the innovations_* external-id columns on customers/contacts.

type Run = {
  id: string;
  entity: string;
  dry_run: boolean;
  received: number;
  upserted: number;
  failed: number;
  status: string;
  started_at: string;
};

type SyncRequest = { id: string; status: string; requested_at: string; finished_at: string | null };
type AccountNumberDuplicate = {
  account_number: string;
  duplicate_count: number;
  customer_ids: number[];
  customer_names: string[];
  customer_contact_ids: (string | null)[];
  customer_is_erp: boolean[];
};

type DuplicateResolutionResult = {
  ok: boolean;
  message: string;
};

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");
const RECENT_MS = 24 * 60 * 60 * 1000;
const SYNC_REQUEST_ENTITIES = ["customers", "contacts", "balances", "statements", "statement_lines", "store_lenses", "store_lens_power_rows"];
const ENTITY_LABELS: Record<string, string> = {
  customers: "Customers",
  contacts: "Contacts",
  balances: "Balances",
  statements: "Statements",
  statement_lines: "Statement lines",
  store_lenses: "Store lens catalog",
  store_lens_power_rows: "Store lens power rows",
};

export default function InnovationsSyncStatusCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ["innovations-sync-status"],
    refetchInterval: 90000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data: runs, error: runErr } = await (supabase as any)
        .from("innovations_sync_runs")
        .select("id,entity,dry_run,received,upserted,failed,status,started_at")
        .order("started_at", { ascending: false })
        .limit(20);
      if (runErr) throw runErr;
      const list = (runs ?? []) as Run[];

      const latestByEntity: Record<string, Run> = {};
      for (const run of list) if (!latestByEntity[run.entity]) latestByEntity[run.entity] = run;

      const [custRes, contactRes, reqRes, duplicateRes] = await Promise.all([
        (supabase as any).from("customers").select("id", { count: "exact", head: true }).not("innovations_customer_id", "is", null),
        (supabase as any).from("contacts").select("id", { count: "exact", head: true }).not("innovations_contact_id", "is", null),
        (supabase as any).from("innovations_sync_requests").select("id,status,requested_at,finished_at").order("requested_at", { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from("customer_account_number_duplicates").select("account_number,duplicate_count,customer_ids,customer_names,customer_contact_ids,customer_is_erp").limit(10),
      ]);

      return {
        runs: list,
        latestByEntity,
        custCount: (custRes.count as number | null) ?? 0,
        contactCount: (contactRes.count as number | null) ?? 0,
        lastRequest: (reqRes.data ?? null) as SyncRequest | null,
        accountNumberDuplicates: ((duplicateRes.data ?? []) as AccountNumberDuplicate[]),
      };
    },
  });

  const pendingRequest = data?.lastRequest && (data.lastRequest.status === "pending" || data.lastRequest.status === "claimed");

  const requestSync = useMutation({
    mutationFn: async () => {
      const { error: insErr } = await (supabase as any)
        .from("innovations_sync_requests")
        .insert({ entities: SYNC_REQUEST_ENTITIES, status: "pending" });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["innovations-sync-status"] });
      toast({ title: "Sync requested", description: "OptiLens Local will run it on its next check." });
    },
    onError: (e: any) => toast({ title: "Could not request sync", description: e.message, variant: "destructive" }),
  });

  const resolveDuplicate = useMutation({
    mutationFn: async (accountNumber: string) => {
      const { data, error } = await (supabase.rpc as any)("resolve_non_erp_duplicate_account_link", {
        p_account_number: accountNumber,
      });
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as DuplicateResolutionResult | null;
      if (!result?.ok) throw new Error(result?.message ?? "This duplicate needs manual review.");
      return result;
    },
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ["innovations-sync-status"] });
      toast({ title: "Duplicate link resolved", description: result.message });
    },
    onError: (e: Error) => toast({ title: "Could not resolve duplicate link", description: e.message, variant: "destructive" }),
  });

  const latestWrite = data?.runs.find((r) => !r.dry_run && (r.status === "success" || r.status === "partial"));
  const live = !!latestWrite && Date.now() - new Date(latestWrite.started_at).getTime() < RECENT_MS;
  const lastAny = data?.runs[0];

  const recheckStatus = async () => {
    const result = await refetch();
    if (result.error) {
      toast({ title: "Could not refresh status", description: result.error.message, variant: "destructive" });
      return;
    }
    const duplicateCount = result.data?.accountNumberDuplicates.length ?? 0;
    toast({
      title: "Integration status refreshed",
      description: duplicateCount
        ? `${duplicateCount} duplicate account-number link${duplicateCount === 1 ? " remains" : "s remain"} for review.`
        : "No duplicate account-number links remain.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4" /> Innovations Sync (OptiLens Local)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                live
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                  : "bg-slate-500/10 text-slate-700 border-slate-300"
              }
            >
              {live ? "Live" : data?.runs.length ? "Idle" : "Awaiting first sync"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void recheckStatus()}
              disabled={isRefetching}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Recheck status
            </Button>
            <Button
              size="sm"
              onClick={() => requestSync.mutate()}
              disabled={requestSync.isPending || !!pendingRequest}
            >
              {(requestSync.isPending || pendingRequest) && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {pendingRequest ? "Sync requested…" : "Sync now"}
            </Button>
          </div>
        </div>
        <CardDescription>
          Outbound push from the office MS SQL (Innovations). This card shows what has landed in the cloud.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading status…
          </div>
        ) : error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-amber-700">
            <span>Could not read sync status. Apply the <code>innovations_sync_v1</code> migration if this persists.</span>
            <Button variant="outline" size="sm" onClick={() => void recheckStatus()} disabled={isRefetching}>
              {isRefetching && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Synced customers: <strong>{data?.custCount ?? 0}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Synced contacts: <strong>{data?.contactCount ?? 0}</strong>
              </div>
              <div className="md:col-span-2 text-muted-foreground">
                Last activity: <strong>{fmt(lastAny?.started_at)}</strong>
                {lastAny ? (lastAny.dry_run ? " (dry run)" : " (write)") : ""}
              </div>
              {data?.lastRequest && (
                <div className="md:col-span-2 text-muted-foreground">
                  Last "Sync now" request: <strong className="capitalize">{data.lastRequest.status}</strong>
                  {" · "}{fmt(data.lastRequest.finished_at ?? data.lastRequest.requested_at)}
                  {pendingRequest && " — waiting for the office agent to pick it up"}
                </div>
              )}
            </div>

            {data && Object.keys(data.latestByEntity).length > 0 && (
              <div className="rounded-md border">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Entity</th>
                      <th className="px-3 py-2 font-medium">Last run</th>
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Upserted / received</th>
                      <th className="px-3 py-2 font-medium">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYNC_REQUEST_ENTITIES.filter((entity) => data.latestByEntity[entity]).map((entity) => {
                      const r = data.latestByEntity[entity];
                      return (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">{ENTITY_LABELS[r.entity] ?? r.entity}</td>
                        <td className="px-3 py-2">{fmt(r.started_at)}</td>
                        <td className="px-3 py-2">{r.dry_run ? "Dry run" : "Write"}</td>
                        <td className="px-3 py-2">{r.upserted} / {r.received}</td>
                        <td className={`px-3 py-2 ${r.failed ? "text-red-600 font-semibold" : ""}`}>{r.failed}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}

            {!!data?.accountNumberDuplicates.length && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                <p className="font-medium">Duplicate account-number links need review</p>
                <div className="mt-2 space-y-2 text-xs">
                  {data.accountNumberDuplicates.map((row) => (
                    <div key={row.account_number} className="flex flex-wrap items-center gap-x-1 gap-y-1">
                      <span className="font-medium">{row.account_number}:</span>
                      {row.customer_ids.map((id, index) => {
                        const contactId = row.customer_contact_ids?.[index];
                        const isErp = row.customer_is_erp?.[index];
                        return (
                          <Button
                            key={id}
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-xs text-amber-900 underline"
                            onClick={() => navigate(contactId
                              ? `/admin/erp/contacts?contact=${encodeURIComponent(contactId)}&tab=account-settings`
                              : `/admin/erp/contacts?erpCustomer=${id}`)}
                          >
                            #{id} {row.customer_names[index] ?? "Unnamed"}{isErp ? " (ERP)" : " (non-ERP)"}
                          </Button>
                        );
                      })}
                      <Button
                        type="button"
                        size="sm"
                        className="ml-2 h-6 px-2 text-[11px]"
                        onClick={() => resolveDuplicate.mutate(row.account_number)}
                        disabled={resolveDuplicate.isPending}
                      >
                        {resolveDuplicate.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                        Fix automatically
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-amber-800">
                  Each record opens directly in Account settings. Automatic repair keeps the single Innovations-owned record and clears only the duplicate ERP link from non-ERP records; no CRM or portal record is deleted.
                </p>
              </div>
            )}

            {data && data.runs.length === 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                No runs yet. Trigger a dry run from OptiLens Local → Integrations → Website feeds.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
