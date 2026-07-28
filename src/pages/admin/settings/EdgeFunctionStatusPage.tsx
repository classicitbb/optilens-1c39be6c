import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, Server, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useEdgeFunctionHealth } from "@/features/admin/edge-function-health/useEdgeFunctionHealth";
import { AGENT_ONLINE_MS, useLiveDataGatewayDiagnostics } from "@/features/admin/edge-function-health/useLiveDataGatewayDiagnostics";

const formatTime = (value: string | null) => value ? new Date(value).toLocaleString() : "Not checked yet";

const statusCodeBadgeVariant = (statusCode: number): "secondary" | "outline" | "destructive" => {
  if (statusCode >= 500) return "destructive";
  if (statusCode >= 400) return "outline";
  return "secondary";
};

export default function EdgeFunctionStatusPage() {
  const health = useEdgeFunctionHealth();
  const gateway = useLiveDataGatewayDiagnostics();
  const functions = health.data?.functions ?? [];
  const latestRun = health.data?.latestRun ?? null;
  const healthyCount = functions.filter((item) => item.is_healthy).length;
  const healthStoragePending = Boolean(
    health.error && /edge_function_health|PGRST205/i.test(health.error.message),
  );
  const gatewayDiagnosticsPending = Boolean(
    gateway.error && /live_data_gateway|PGRST205/i.test(gateway.error.message),
  );
  const gatewayFunction = functions.find((item) => item.function_name === "live-data-gateway") ?? null;
  const gatewayAgent = gateway.data?.agent ?? null;
  const gatewayRequestLog = gateway.data?.requestLog ?? [];
  const agentOnline = Boolean(
    gatewayAgent && Date.now() - new Date(gatewayAgent.last_seen_at).getTime() < AGENT_ONLINE_MS,
  );

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeader icon={Activity} title="Edge Function Status">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void health.refetch()} disabled={health.isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${health.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {latestRun?.is_healthy ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
            {latestRun ? (latestRun.is_healthy ? "All monitored functions are ready" : "Function readiness needs attention") : "Waiting for the first health check"}
          </CardTitle>
          <CardDescription>
            The release gate and five-minute monitor use the same non-destructive readiness probes. This page updates as new results arrive.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant={latestRun?.is_healthy ? "secondary" : "destructive"}>{healthyCount}/{functions.length || latestRun?.function_count || 0} ready</Badge>
          {latestRun ? <Badge variant="outline">Last {latestRun.source} check: {formatTime(latestRun.created_at)}</Badge> : null}
          {latestRun?.release_sha ? <Badge variant="outline">Release {latestRun.release_sha.slice(0, 7)}</Badge> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Live-Data Gateway Connector
          </CardTitle>
          <CardDescription>OptiLens Local's heartbeat and the gateway function's own reachability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant={gatewayFunction?.is_healthy ? "secondary" : "destructive"}>
              {gatewayFunction ? (gatewayFunction.is_healthy ? "Gateway reachable" : "Gateway unreachable") : "Gateway status unknown"}
            </Badge>
            <Badge variant={agentOnline ? "secondary" : "destructive"}>{agentOnline ? "Agent online" : "Agent offline"}</Badge>
            <Badge variant="outline">Heartbeat: {formatTime(gatewayAgent?.last_seen_at ?? null)}</Badge>
          </div>
          {gatewayDiagnosticsPending ? (
            <p className="text-xs text-muted-foreground">Connector storage is awaiting its database migration.</p>
          ) : gatewayAgent?.last_error ? (
            <p className="break-words text-xs text-destructive">Last error: {gatewayAgent.last_error}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Gateway Requests</CardTitle>
          <CardDescription>Last {gatewayRequestLog.length} calls to live-data-gateway — action, response code, and latency.</CardDescription>
        </CardHeader>
        <CardContent>
          {gatewayDiagnosticsPending ? (
            <p className="text-sm text-muted-foreground">Request log storage is awaiting its database migration.</p>
          ) : gatewayRequestLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="p-2 font-medium">Time</th>
                    <th className="p-2 font-medium">Action</th>
                    <th className="p-2 font-medium">Operation</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {gatewayRequestLog.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="whitespace-nowrap p-2">{formatTime(row.created_at)}</td>
                      <td className="p-2"><code>{row.action}</code></td>
                      <td className="p-2 text-muted-foreground">{row.operation ?? "—"}</td>
                      <td className="p-2"><Badge variant={statusCodeBadgeVariant(row.status_code)}>{row.status_code}</Badge></td>
                      <td className="p-2 text-muted-foreground">{row.latency_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {health.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-lg border bg-muted/40" />)}</div>
      ) : health.error && !healthStoragePending ? (
        <Card className="border-destructive/50"><CardContent className="flex items-center gap-2 p-4 text-sm text-destructive"><XCircle className="h-4 w-4" />Unable to load edge-function health. {health.error.message}</CardContent></Card>
      ) : functions.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">{healthStoragePending ? "Health storage is awaiting its database migration. Apply the release migration, then the next deployment or scheduled monitor will populate this page." : "No check has been recorded yet. The next deployment or scheduled monitor will populate this page."}</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {functions.map((item) => (
            <Card key={item.function_name} className={item.is_healthy ? "border-emerald-500/25" : "border-destructive/50"}>
              <CardHeader className="space-y-2 p-4 pb-2">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <code className="truncate">{item.function_name}</code>
                  {item.is_healthy ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Ready" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-label="Unavailable" />}
                </CardTitle>
                <Badge variant={item.is_healthy ? "secondary" : "destructive"} className="w-fit">{item.is_healthy ? "Ready" : "Unavailable"}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Checked {formatTime(item.checked_at)}</p>
                {item.consecutive_failures > 0 ? <p>{item.consecutive_failures} consecutive failed check{item.consecutive_failures === 1 ? "" : "s"}</p> : null}
                {item.last_error ? <p className="break-words text-destructive">{item.last_error}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
