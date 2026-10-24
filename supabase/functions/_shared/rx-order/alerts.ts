// Which Rx submissions need staff attention, and have not been flagged yet.
// Pure, so the rule is tested and the scheduled function only does I/O.
//
//   failed    a submission in status `failed` — alert once per failure
//   stale     the lab says hold / problem and has said nothing newer for STALE_HOURS —
//             alert once per STALE_HOURS while it stays that way
//
// An alert is remembered as an `staff_alerted` event on the quote, so a repeat run
// does not email the same problem again.
export const STALE_HOURS = 24;

const PROBLEM_LAB = /hold|problem|error|reject|remake|issue|stuck|fail/i;

export interface AlertSubmission {
  id: string;
  quote_id: string;
  status: string;
  last_error: string | null;
  lab_status: string | null;
  lab_status_detail: string | null;
  lab_status_at: string | null;
  created_at: string;
}
export interface AlertEvent { submission_id: string | null; event: string; created_at: string }

export interface StaffAlert {
  submissionId: string;
  quoteId: string;
  kind: "failed" | "stale";
  detail: string;
}

export function dueAlerts(submissions: readonly AlertSubmission[], events: readonly AlertEvent[], now: Date): StaffAlert[] {
  const lastAlert = new Map<string, number>();
  const lastFailure = new Map<string, number>();
  for (const e of events) {
    const at = Date.parse(e.created_at);
    if (!e.submission_id || Number.isNaN(at)) continue;
    if (e.event === "staff_alerted") lastAlert.set(e.submission_id, Math.max(lastAlert.get(e.submission_id) ?? 0, at));
    if (e.event === "submission_failed") lastFailure.set(e.submission_id, Math.max(lastFailure.get(e.submission_id) ?? 0, at));
  }
  const staleMs = STALE_HOURS * 3600 * 1000;
  const out: StaffAlert[] = [];
  for (const s of submissions) {
    const alertedAt = lastAlert.get(s.id) ?? 0;
    if (s.status === "failed") {
      // alert again only if it failed again since the last alert
      const failedAt = lastFailure.get(s.id) ?? Date.parse(s.created_at);
      if (failedAt > alertedAt) out.push({ submissionId: s.id, quoteId: s.quote_id, kind: "failed", detail: s.last_error ?? "Delivery failed" });
      continue;
    }
    if (["approved", "claimed", "submitted"].includes(s.status) && s.lab_status && PROBLEM_LAB.test(s.lab_status) && s.lab_status_at) {
      const since = Date.parse(s.lab_status_at);
      if (now.getTime() - since >= staleMs && now.getTime() - alertedAt >= staleMs) {
        out.push({ submissionId: s.id, quoteId: s.quote_id, kind: "stale", detail: `${s.lab_status}${s.lab_status_detail ? ` — ${s.lab_status_detail}` : ""}` });
      }
    }
  }
  return out;
}
