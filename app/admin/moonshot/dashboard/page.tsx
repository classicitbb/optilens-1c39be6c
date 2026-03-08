"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WorkspaceGrid } from "../components/workspace-grid";
import { selectDashboardKpis, selectExecutionTrend, selectScorecardTrend } from "../lib/dashboard-selectors";
import { useMoonshotStore } from "../lib/store";

const deltaTone = (value: number) => (value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-500");

function KpiCard({
  title,
  value,
  secondary,
  delta,
  href,
}: {
  title: string;
  value: string;
  secondary: string;
  delta?: number;
  href: string;
}) {
  const router = useRouter();
  const trendUp = (delta ?? 0) >= 0;

  return (
    <Card className="cursor-pointer rounded-xl border bg-white transition hover:shadow-md" onClick={() => router.push(href)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{secondary}</span>
          {typeof delta === "number" ? (
            <span className={`inline-flex items-center gap-1 font-medium ${deltaTone(delta)}`}>
              {trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta)} pts
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const state = useMoonshotStore();
  const kpis = selectDashboardKpis(state);
  const scorecardTrend = selectScorecardTrend(state);
  const executionTrend = selectExecutionTrend(state);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Meetings This Week"
          value={String(kpis.meetings.thisWeek)}
          secondary={`${kpis.meetings.completionRate}% completion rate`}
          href="/admin/moonshot/meetings?range=this-week"
        />
        <KpiCard
          title="Metrics On Track"
          value={`${kpis.metrics.onTrackPct}%`}
          secondary={`${kpis.metrics.offTrackCount} off track`}
          delta={kpis.metrics.trendDelta}
          href="/admin/moonshot/scorecards?status=off-track"
        />
        <KpiCard
          title="Rocks On Track"
          value={`${kpis.rocks.onTrackPct}%`}
          secondary={`${kpis.rocks.completedThisQuarter} completed this quarter · ${kpis.rocks.atRiskCount} at risk`}
          href="/admin/moonshot/rocks?status=at-risk"
        />
        <KpiCard
          title="To-Dos"
          value={`${kpis.todos.open} open`}
          secondary={`${kpis.todos.completed} completed · ${kpis.todos.overdue} overdue`}
          href="/admin/moonshot/todos?status=open&due=overdue"
        />
        <KpiCard
          title="Issues"
          value={`${kpis.issues.open} open`}
          secondary={`${kpis.issues.resolved} resolved · ${kpis.issues.avgAgeDays}d avg age`}
          href="/admin/moonshot/issues?status=open"
        />
        <KpiCard
          title="Business Plan Completion"
          value={`${kpis.businessPlan.completionPct}%`}
          secondary="Future + short-term plan completion"
          href="/admin/moonshot/business-plan?view=completion"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="rounded-xl border bg-white">
          <CardHeader>
            <CardTitle className="text-base">Scorecard Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scorecardTrend}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="onTrackPct" stroke="#059669" strokeWidth={2} name="On-track %" />
                <Line type="monotone" dataKey="avgActual" stroke="#6366f1" strokeWidth={2} name="Avg actual" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl border bg-white">
          <CardHeader>
            <CardTitle className="text-base">Execution Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={executionTrend}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="todoCompletionPct" stroke="#2563eb" strokeWidth={2} name="Todo completion %" />
                <Line type="monotone" dataKey="issueResolutionPct" stroke="#f59e0b" strokeWidth={2} name="Issue resolution %" />
                <Line type="monotone" dataKey="rockOnTrackPct" stroke="#16a34a" strokeWidth={2} name="Rock on-track %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <WorkspaceGrid scope="dashboard" />
    </div>
  );
}
