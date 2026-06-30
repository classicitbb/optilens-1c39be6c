import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Database, Loader2, PlugZap } from "lucide-react";

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

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");
const RECENT_MS = 24 * 60 * 60 * 1000;

export default function InnovationsSyncStatusCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["innovations-sync-status"],
    refetchInterval: 30000,
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

      const [custRes, contactRes] = await Promise.all([
        (supabase as any).from("customers").select("id", { count: "exact", head: true }).not("innovations_customer_id", "is", null),
        (supabase as any).from("contacts").select("id", { count: "exact", head: true }).not("innovations_contact_id", "is", null),
      ]);

      return {
        runs: list,
        latestByEntity,
        custCount: (custRes.count as number | null) ?? 0,
        contactCount: (contactRes.count as number | null) ?? 0,
      };
    },
  });

  const latestWrite = data?.runs.find((r) => !r.dry_run && (r.status === "success" || r.status === "partial"));
  const live = !!latestWrite && Date.now() - new Date(latestWrite.started_at).getTime() < RECENT_MS;
  const lastAny = data?.runs[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4" /> Innovations Sync (OptiLens Local)
          </CardTitle>
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
          <div className="text-amber-700">
            Could not read sync status. Apply the <code>innovations_sync_v1</code> migration if this persists.
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
                    {Object.values(data.latestByEntity).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2 capitalize">{r.entity}</td>
                        <td className="px-3 py-2">{fmt(r.started_at)}</td>
                        <td className="px-3 py-2">{r.dry_run ? "Dry run" : "Write"}</td>
                        <td className="px-3 py-2">{r.upserted} / {r.received}</td>
                        <td className={`px-3 py-2 ${r.failed ? "text-red-600 font-semibold" : ""}`}>{r.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
