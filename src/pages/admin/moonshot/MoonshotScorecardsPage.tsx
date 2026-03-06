import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";

export default function MoonshotScorecardsPage() {
  const { metrics, addMetric, deleteMetric } = useMoonshotStore();
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Weekly Scorecard</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>Name</th><th>Owner</th><th>Target</th><th>Actual</th><th /></tr></thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id} className="border-t"><td>{m.name}</td><td>{m.owner}</td><td>{m.target}</td><td>{m.actual}</td><td><Button size="sm" variant="destructive" onClick={() => deleteMetric(m.id)}>Delete</Button></td></tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-4">
            <Input placeholder="Metric name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => { if (!name) return; addMetric({ name, owner: "Classic", target: 10, trend: "up", week: "W1", frequency: "weekly", unit: "number" }); setName(""); }}>Add Metric</Button>
          </div>
        </CardContent>
      </Card>
      <Card><CardContent className="h-72 pt-6"><ResponsiveContainer width="100%" height="100%"><BarChart data={metrics}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="actual" fill="#0f766e" /></BarChart></ResponsiveContainer></CardContent></Card>
    </div>
  );
}
