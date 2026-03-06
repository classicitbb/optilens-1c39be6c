"use client";

import { addWeeks, format } from "date-fns";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricFrequencyTabs, MetricsTable } from "../components/metrics-table";
import { useMoonshotStore } from "../lib/store";
import { MetricFrequency } from "../lib/types";

export default function ScorecardsPage() {
  const { users, addMetric } = useMoonshotStore();
  const [tab, setTab] = useState<MetricFrequency>("weekly");
  const [owner, setOwner] = useState("Classic");
  const [metricName, setMetricName] = useState("New Metric");
  const [goal, setGoal] = useState(100);
  const [frequency, setFrequency] = useState<MetricFrequency>("weekly");
  const [unit, setUnit] = useState<"number" | "percent" | "currency">("number");

  return (
    <Card className="rounded-xl border bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Scorecard</CardTitle>
        <div className="flex items-center gap-2">
          <MetricFrequencyTabs value={tab} onChange={setTab} />
          <Dialog>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Add Metric</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Metric</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Who</Label><Select value={owner} onValueChange={setOwner}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label>Metric Name</Label><Input value={metricName} onChange={(e) => setMetricName(e.target.value)} /></div>
                <div className="space-y-1"><Label>Goal Value</Label><Input type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value || 0))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Frequency</Label><Select value={frequency} onValueChange={(v: MetricFrequency) => setFrequency(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1"><Label>Unit</Label><Select value={unit} onValueChange={(v: "number" | "percent" | "currency") => setUnit(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="number">Number</SelectItem><SelectItem value="percent">Percent</SelectItem><SelectItem value="currency">Currency</SelectItem></SelectContent></Select></div>
                </div>
                <Button className="w-full" onClick={() => {
                  const points = [0, 1, 2, 3, 4, 5].map((idx) => ({ date: format(addWeeks(new Date(), idx - 5), "MMM d"), value: Math.max(0, goal - 10 + idx * 3) }));
                  addMetric({ name: metricName, owner, target: goal, trend: "flat", week: "W1", frequency, unit, actual: points[points.length - 1].value, points });
                }}>Save Metric</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <MetricsTable frequency={tab} />
      </CardContent>
    </Card>
  );
}
