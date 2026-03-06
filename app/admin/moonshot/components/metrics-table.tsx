"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMoonshotStore } from "../lib/store";
import { MetricFrequency } from "../lib/types";

const frequencyOrder: MetricFrequency[] = ["daily", "weekly", "monthly", "quarterly"];

export function MetricsTable({ frequency, compact = false }: { frequency: MetricFrequency; compact?: boolean }) {
  const { metrics, users, updateMetric, updateMetricPoint } = useMoonshotStore();
  const [hover, setHover] = useState<{ metricId: string; date: string } | null>(null);

  const filteredMetrics = metrics.filter((m) => m.frequency === frequency);
  const dateColumns = useMemo(() => {
    const dates = new Set<string>();
    filteredMetrics.forEach((m) => m.points.forEach((p) => dates.add(p.date)));
    return Array.from(dates);
  }, [filteredMetrics]);

  const formatValue = (v: number, unit: "number" | "percent" | "currency") => {
    if (unit === "percent") return `${v}%`;
    if (unit === "currency") return `$${v}`;
    return String(v);
  };

  return (
    <div className="relative overflow-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-2">Who</th>
            <th className="py-2 pr-2">Metric</th>
            <th className="py-2 pr-2">Goal</th>
            {dateColumns.map((date) => <th key={date} className="py-2 px-1 text-center">{date}</th>)}
          </tr>
        </thead>
        <tbody>
          {filteredMetrics.map((metric) => {
            const user = users.find((u) => u.name === metric.owner);
            return (
              <tr key={metric.id} className="border-b align-top">
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7"><AvatarFallback>{user?.avatar ?? metric.owner.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <span>{metric.owner}</span>
                  </div>
                </td>
                <td className="py-2 pr-2"><Input value={metric.name} onChange={(e) => updateMetric(metric.id, { name: e.target.value })} className="h-8" /></td>
                <td className="py-2 pr-2"><Input type="number" value={metric.target} onChange={(e) => updateMetric(metric.id, { target: Number(e.target.value || 0) })} className="h-8 w-24" /></td>
                {dateColumns.map((date) => {
                  const point = metric.points.find((p) => p.date === date);
                  const val = point?.value ?? 0;
                  const meetsGoal = val >= metric.target;
                  return (
                    <td key={date} className="p-1">
                      <div
                        className={cn("rounded-md px-2 py-2 text-center text-xs font-medium cursor-pointer", meetsGoal ? "bg-[#10b981]/20 text-emerald-700" : "bg-[#ef4444]/20 text-red-700")}
                        onMouseEnter={() => setHover({ metricId: metric.id, date })}
                        onMouseLeave={() => setHover(null)}
                      >
                        <Input
                          type="number"
                          value={val}
                          onChange={(e) => updateMetricPoint(metric.id, date, Number(e.target.value || 0))}
                          className={cn("h-7 text-center border-0 p-0 focus-visible:ring-0", meetsGoal ? "bg-transparent text-emerald-700" : "bg-transparent text-red-700")}
                        />
                        {!compact ? <div>{formatValue(val, metric.unit)}</div> : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {hover ? (
        <Card className="absolute right-4 top-4 z-20 w-64 p-3 shadow-lg">
          {(() => {
            const metric = filteredMetrics.find((m) => m.id === hover.metricId);
            if (!metric) return null;
            return (
              <div className="space-y-2">
                <p className="text-xs font-medium">Trend · {metric.name}</p>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metric.points}>
                      <XAxis dataKey="date" hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </Card>
      ) : null}

      {!filteredMetrics.length ? <p className="text-sm text-muted-foreground py-8">No metrics for {frequency} yet.</p> : null}
    </div>
  );
}

export function MetricFrequencyTabs({ value, onChange }: { value: MetricFrequency; onChange: (v: MetricFrequency) => void }) {
  return (
    <div className="inline-flex rounded-full border bg-slate-50 p-1">
      {frequencyOrder.map((f) => (
        <button key={f} onClick={() => onChange(f)} className={cn("px-3 py-1 text-sm rounded-full capitalize", value === f ? "bg-white shadow text-slate-900" : "text-slate-500")}>
          {f}
        </button>
      ))}
    </div>
  );
}
