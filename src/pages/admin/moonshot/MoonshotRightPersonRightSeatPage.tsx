import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";
import type { SeatFitReview, SeatFitStatus } from "@/features/admin/moonshot/lib/types";

const statusOptions: SeatFitStatus[] = ["Great fit", "Good fit", "Stretch", "Misaligned"];
const cadenceOptions = ["monthly", "quarterly", "biannual"] as const;

const getAverageScore = (review: Pick<SeatFitReview, "valuesMatch" | "roleCompetency" | "performanceConfidence">) =>
  Number(((review.valuesMatch + review.roleCompetency + review.performanceConfidence) / 3).toFixed(1));

const statusColor: Record<SeatFitStatus, string> = {
  "Great fit": "bg-green-100 text-green-800",
  "Good fit": "bg-blue-100 text-blue-800",
  Stretch: "bg-yellow-100 text-yellow-800",
  Misaligned: "bg-red-100 text-red-800",
};

export default function MoonshotRightPersonRightSeatPage() {
  const users = useMoonshotStore((s) => s.users);
  const seats = useMoonshotStore((s) => s.seats);
  const reviews = useMoonshotStore((s) => s.seatFitReviews);
  const addReview = useMoonshotStore((s) => s.addSeatFitReview);
  const updateReview = useMoonshotStore((s) => s.updateSeatFitReview);
  const deleteReview = useMoonshotStore((s) => s.deleteSeatFitReview);

  const [form, setForm] = useState({
    userId: users[0]?.id ?? "",
    seatId: seats[0]?.id ?? "",
    valuesMatch: 3,
    roleCompetency: 3,
    performanceConfidence: 3,
    fitStatus: "Good fit" as SeatFitStatus,
    reviewCadence: "quarterly" as "monthly" | "quarterly" | "biannual",
    roleExpectations: seats[0]?.roleExpectations ?? "",
    competencyRubric: seats[0]?.competencyRubric ?? "",
    notes: "",
    reviewDate: new Date().toISOString().slice(0, 10),
  });

  const historicalSnapshots = useMemo(() => reviews
    .slice()
    .sort((a, b) => a.reviewDate.localeCompare(b.reviewDate))
    .map((review) => {
      const user = users.find((u) => u.id === review.userId)?.name ?? "Unknown";
      const seat = seats.find((s) => s.id === review.seatId)?.name ?? "Unknown";
      return { ...review, label: `${review.reviewDate} • ${user} → ${seat}`, average: getAverageScore(review) };
    }), [reviews, users, seats]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Tool links & help</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Button asChild size="sm" variant="outline"><Link to="/admin/moonshot/tools/org-chart">Go to Org Chart</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/admin/moonshot/tools/one-on-ones">Go to One-on-Ones</Link></Button>
          <Button asChild size="sm" variant="ghost"><Link to="/admin/moonshot/resources">Open help resources</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Create seat fit review</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={form.userId} onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}>
              <SelectTrigger><SelectValue placeholder="User" /></SelectTrigger>
              <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.seatId} onValueChange={(v) => {
              const seat = seats.find((s) => s.id === v);
              setForm((f) => ({ ...f, seatId: v, roleExpectations: seat?.roleExpectations ?? f.roleExpectations, competencyRubric: seat?.competencyRubric ?? f.competencyRubric }));
            }}>
              <SelectTrigger><SelectValue placeholder="Seat" /></SelectTrigger>
              <SelectContent>{seats.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.fitStatus} onValueChange={(v) => setForm((f) => ({ ...f, fitStatus: v as SeatFitStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input value={form.roleExpectations} placeholder="Role expectations" onChange={(e) => setForm((f) => ({ ...f, roleExpectations: e.target.value }))} />
            <Input value={form.competencyRubric} placeholder="Competency rubric" onChange={(e) => setForm((f) => ({ ...f, competencyRubric: e.target.value }))} />
            <Select value={form.reviewCadence} onValueChange={(v) => setForm((f) => ({ ...f, reviewCadence: v as typeof cadenceOptions[number] }))}>
              <SelectTrigger><SelectValue placeholder="Review cadence" /></SelectTrigger>
              <SelectContent>{cadenceOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ScoreField label="Values match" value={form.valuesMatch} onChange={(v) => setForm((f) => ({ ...f, valuesMatch: v }))} />
            <ScoreField label="Role competency" value={form.roleCompetency} onChange={(v) => setForm((f) => ({ ...f, roleCompetency: v }))} />
            <ScoreField label="Performance confidence" value={form.performanceConfidence} onChange={(v) => setForm((f) => ({ ...f, performanceConfidence: v }))} />
          </div>

          <textarea className="min-h-20 w-full rounded-md border bg-background p-2 text-sm" placeholder="Review notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <Button onClick={() => { addReview(form); setForm((f) => ({ ...f, notes: "" })); }}>Save review</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Person-seat mapping</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {reviews.map((review) => {
            const user = users.find((u) => u.id === review.userId);
            const seat = seats.find((s) => s.id === review.seatId);
            return (
              <div key={review.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user?.name ?? "Unknown"} → {seat?.name ?? "Unknown"}</p>
                    <Badge className={statusColor[review.fitStatus]}>{review.fitStatus}</Badge>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => deleteReview(review.id)}>Delete</Button>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <ScoreInline label="Values" value={review.valuesMatch} onChange={(v) => updateReview(review.id, { valuesMatch: v })} />
                  <ScoreInline label="Competency" value={review.roleCompetency} onChange={(v) => updateReview(review.id, { roleCompetency: v })} />
                  <ScoreInline label="Confidence" value={review.performanceConfidence} onChange={(v) => updateReview(review.id, { performanceConfidence: v })} />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Fit status</span>
                    <Select value={review.fitStatus} onValueChange={(v) => updateReview(review.id, { fitStatus: v as SeatFitStatus })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input className="h-8" value={review.roleExpectations ?? ""} placeholder="Role expectations" onChange={(e) => updateReview(review.id, { roleExpectations: e.target.value })} />
                  <Input className="h-8" value={review.competencyRubric ?? ""} placeholder="Competency rubric" onChange={(e) => updateReview(review.id, { competencyRubric: e.target.value })} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Average fit score: <strong className="text-foreground">{getAverageScore(review)} / 5</strong></span>
                  <Input type="date" className="h-8 w-auto" value={review.reviewDate} onChange={(e) => updateReview(review.id, { reviewDate: e.target.value })} />
                  <Select value={review.reviewCadence ?? "quarterly"} onValueChange={(v) => updateReview(review.id, { reviewCadence: v as typeof cadenceOptions[number] })}>
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{cadenceOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <textarea className="min-h-16 w-full rounded-md border bg-background p-2 text-sm" value={review.notes} onChange={(e) => updateReview(review.id, { notes: e.target.value })} />
              </div>
            );
          })}
          {reviews.length === 0 && <p className="text-sm text-muted-foreground">No seat fit reviews yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historical snapshots</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {historicalSnapshots.map((snapshot) => (
            <div key={snapshot.id} className="rounded-md border px-3 py-2 flex items-center justify-between gap-3">
              <p className="truncate">{snapshot.label}</p>
              <Badge variant="outline">{snapshot.average} / 5</Badge>
            </div>
          ))}
          {historicalSnapshots.length === 0 ? <p className="text-muted-foreground">No review history yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
      <span className="text-sm font-semibold">{value} / 5</span>
    </div>
  );
}

function ScoreInline({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input type="number" min={1} max={5} className="h-8" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
