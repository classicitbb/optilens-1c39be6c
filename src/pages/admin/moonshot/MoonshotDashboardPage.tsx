import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";

export default function MoonshotDashboardPage() {
  const { meetings, metrics, rocks, todos, issues } = useMoonshotStore();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {([["Meetings", meetings.length], ["Metrics", metrics.length], ["Rocks", rocks.length], ["Todos", todos.length], ["Issues", issues.length]] as const).map(([k, v]) => (
          <Card key={k}><CardHeader className="pb-2"><CardTitle className="text-sm">{k}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{v}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Score Trend</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="actual" stroke="#0f766e" strokeWidth={2} />
              <Line type="monotone" dataKey="target" stroke="#14b8a6" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
