import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clearRuntimeErrorLog, getRuntimeErrorLog } from "@/lib/runtimeErrorLog";
import { supabase } from "@/integrations/supabase/client";

const formatTimestamp = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

type ServerRuntimeError = {
  id: string;
  route: string | null;
  source: string | null;
  title: string | null;
  detail: string | null;
  component_stack: string | null;
  user_agent: string | null;
  url: string | null;
  created_at: string;
};

async function loadServerErrors(): Promise<ServerRuntimeError[]> {
  const { data, error } = await (supabase as any)
    .from("runtime_error_events")
    .select("id, route, source, title, detail, component_stack, user_agent, url, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export default function RuntimeErrorsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const localEntries = useMemo(() => getRuntimeErrorLog(), [refreshKey]);
  const serverQuery = useQuery<ServerRuntimeError[]>({
    queryKey: ["runtime_error_events"],
    queryFn: loadServerErrors,
    refetchInterval: 10000,
  });

  const serverEntries = serverQuery.data ?? [];
  const isLoading = serverQuery.isLoading;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Runtime Error Log</h1>
          <p className="text-sm text-muted-foreground">
            Server-side runtime error events plus local browser log for quick QA/Codex review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            setRefreshKey((x) => x + 1);
            void serverQuery.refetch();
          }}>Refresh</Button>
          <Button
            variant="destructive"
            onClick={() => {
              clearRuntimeErrorLog();
              setRefreshKey((x) => x + 1);
            }}
          >
            Clear local log
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server events ({serverEntries.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading server events…</p>
          ) : serverEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No server events yet.</p>
          ) : (
            serverEntries.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">server</Badge>
                  <span className="font-medium">{entry.error_message ?? "Unhandled error"}</span>
                </div>
                <p className="text-muted-foreground">
                  {formatTimestamp(entry.created_at)} {entry.route_label ? `• ${entry.route_label}` : ""}
                </p>
                {entry.url ? <p className="break-all text-xs text-muted-foreground">{entry.url}</p> : null}
                {entry.error_stack ? <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">{entry.error_stack}</pre> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local browser log ({localEntries.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {localEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No captured errors yet.</p>
          ) : (
            localEntries.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{entry.source}</Badge>
                  <span className="font-medium">{entry.title}</span>
                </div>
                <p className="text-muted-foreground">
                  {formatTimestamp(entry.timestamp)} {entry.route ? `• ${entry.route}` : ""}
                </p>
                {entry.detail ? <p className="break-all">{entry.detail}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
