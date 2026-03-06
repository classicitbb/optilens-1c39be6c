import { format } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";

const columns: Array<"On Track" | "Off Track" | "Completed"> = ["On Track", "Off Track", "Completed"];

export default function MoonshotRocksPage() {
  const { rocks, addRock, updateRock } = useMoonshotStore();
  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Quarterly Rocks</h2>
        <Button onClick={() => addRock({ title: "New Quarterly Priority", owner: "Classic", dueDate: new Date().toISOString().slice(0, 10), status: "On Track", percentComplete: 0, notes: "" })}>Add Rock</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((status) => (
          <Card key={status} className="rounded-xl border bg-card" onDragOver={(e) => e.preventDefault()} onDrop={() => {
            if (!dragId) return;
            updateRock(dragId, { status });
            setDragId(null);
          }}>
            <CardHeader><CardTitle className="text-base flex items-center justify-between">{status} <Badge variant="outline">{rocks.filter((r) => r.status === status).length}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-3 min-h-40">
              {rocks.filter((r) => r.status === status).map((rock) => (
                <div key={rock.id} draggable onDragStart={() => setDragId(rock.id)} className="rounded-lg border p-3 space-y-2 bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{rock.title}</p>
                    <Badge className={status === "Completed" ? "bg-emerald-100 text-emerald-700" : status === "Off Track" ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"}>{status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Owner: {rock.owner}</span>
                    <span>Due: {format(new Date(rock.dueDate), "MMM d")}</span>
                  </div>
                  <div>
                    <label className="text-xs">% Complete</label>
                    <Input type="number" value={rock.percentComplete ?? 0} onChange={(e) => updateRock(rock.id, { percentComplete: Number(e.target.value || 0) })} className="h-8" />
                  </div>
                  <Textarea value={rock.notes ?? ""} onChange={(e) => updateRock(rock.id, { notes: e.target.value })} className="min-h-16" placeholder="Notes" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
