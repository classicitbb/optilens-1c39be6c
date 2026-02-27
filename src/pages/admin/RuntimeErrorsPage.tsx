import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clearRuntimeErrorLog, getRuntimeErrorLog } from "@/lib/runtimeErrorLog";

const formatTimestamp = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

export default function RuntimeErrorsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const entries = useMemo(() => getRuntimeErrorLog(), [refreshKey]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Runtime Error Log</h1>
          <p className="text-sm text-muted-foreground">
            One-line log of destructive toasts and unhandled browser errors for quick QA/Codex review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRefreshKey((x) => x + 1)}>Refresh</Button>
          <Button
            variant="destructive"
            onClick={() => {
              clearRuntimeErrorLog();
              setRefreshKey((x) => x + 1);
            }}
          >
            Clear log
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent errors ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No captured errors yet.</p>
          ) : (
            entries.map((entry) => (
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
