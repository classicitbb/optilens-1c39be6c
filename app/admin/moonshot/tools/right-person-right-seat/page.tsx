"use client";

import { useState } from "react";
import { useMoonshotStore } from "../../lib/store";
import { SeatFitReview, SeatFitStatus } from "../../lib/types";

const statusOptions: SeatFitStatus[] = ["Great fit", "Good fit", "Stretch", "Misaligned"];

const getAverageScore = (review: Pick<SeatFitReview, "valuesMatch" | "roleCompetency" | "performanceConfidence">) =>
  ((review.valuesMatch + review.roleCompetency + review.performanceConfidence) / 3).toFixed(1);

export default function RightPersonRightSeatPage() {
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
    notes: "",
    reviewDate: new Date().toISOString().slice(0, 10),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Create seat fit review</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <select className="rounded-md border p-2 text-sm" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <select className="rounded-md border p-2 text-sm" value={form.seatId} onChange={(e) => setForm((f) => ({ ...f, seatId: e.target.value }))}>
            {seats.map((seat) => <option key={seat.id} value={seat.id}>{seat.name}</option>)}
          </select>
          <select className="rounded-md border p-2 text-sm" value={form.fitStatus} onChange={(e) => setForm((f) => ({ ...f, fitStatus: e.target.value as SeatFitStatus }))}>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <input type="date" className="rounded-md border p-2 text-sm" value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ScoreField label="Values match" value={form.valuesMatch} onChange={(value) => setForm((f) => ({ ...f, valuesMatch: value }))} />
          <ScoreField label="Role competency" value={form.roleCompetency} onChange={(value) => setForm((f) => ({ ...f, roleCompetency: value }))} />
          <ScoreField label="Performance confidence" value={form.performanceConfidence} onChange={(value) => setForm((f) => ({ ...f, performanceConfidence: value }))} />
        </div>

        <textarea className="mt-4 min-h-20 w-full rounded-md border p-2 text-sm" placeholder="Review notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />

        <button
          type="button"
          className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => {
            addReview(form);
            setForm((f) => ({ ...f, notes: "" }));
          }}
        >
          Save review
        </button>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Person-seat mapping</h2>
        <div className="space-y-3">
          {reviews.map((review) => {
            const user = users.find((item) => item.id === review.userId);
            const seat = seats.find((item) => item.id === review.seatId);
            return (
              <div key={review.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">
                    {user?.name ?? "Unknown user"} → {seat?.name ?? "Unknown seat"}
                  </p>
                  <button type="button" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => deleteReview(review.id)}>Delete</button>
                </div>

                <div className="mt-2 grid gap-2 text-sm md:grid-cols-4">
                  <ScoreInline label="Values" value={review.valuesMatch} onChange={(value) => updateReview(review.id, { valuesMatch: value })} />
                  <ScoreInline label="Competency" value={review.roleCompetency} onChange={(value) => updateReview(review.id, { roleCompetency: value })} />
                  <ScoreInline label="Confidence" value={review.performanceConfidence} onChange={(value) => updateReview(review.id, { performanceConfidence: value })} />
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Fit status</span>
                    <select className="rounded-md border p-1" value={review.fitStatus} onChange={(e) => updateReview(review.id, { fitStatus: e.target.value as SeatFitStatus })}>
                      {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>Average score: <strong>{getAverageScore(review)}</strong></span>
                  <label className="flex items-center gap-1">
                    Review date
                    <input type="date" className="rounded-md border p-1" value={review.reviewDate} onChange={(e) => updateReview(review.id, { reviewDate: e.target.value })} />
                  </label>
                </div>

                <textarea className="mt-2 min-h-16 w-full rounded-md border p-2 text-sm" value={review.notes} onChange={(e) => updateReview(review.id, { notes: e.target.value })} />
              </div>
            );
          })}
          {reviews.length === 0 && <p className="text-sm text-slate-500">No seat fit reviews yet.</p>}
        </div>
      </div>
    </div>
  );
}

function ScoreField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1 rounded-md border p-2 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input type="range" min={1} max={5} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="text-sm font-semibold text-slate-800">{value} / 5</span>
    </label>
  );
}

function ScoreInline({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <input type="number" min={1} max={5} className="rounded-md border p-1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
