import { describe, expect, it } from "vitest";
import { dueAlerts, STALE_HOURS, type AlertEvent, type AlertSubmission } from "../../../supabase/functions/_shared/rx-order/alerts";

const NOW = new Date("2026-10-10T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600 * 1000).toISOString();
const sub = (over: Partial<AlertSubmission> = {}): AlertSubmission => ({
  id: "s1", quote_id: "q1", status: "failed", last_error: "Innovations refused it", lab_status: null, lab_status_detail: null, lab_status_at: null, created_at: hoursAgo(5), ...over,
});
const ev = (event: string, h: number, id = "s1"): AlertEvent => ({ submission_id: id, event, created_at: hoursAgo(h) });

describe("dueAlerts", () => {
  it("alerts once for a failed submission, then stays quiet", () => {
    expect(dueAlerts([sub()], [], NOW)).toEqual([{ submissionId: "s1", quoteId: "q1", kind: "failed", detail: "Innovations refused it" }]);
    expect(dueAlerts([sub()], [ev("submission_failed", 4), ev("staff_alerted", 3)], NOW)).toEqual([]);
  });

  it("alerts again if it fails again after the last alert", () => {
    expect(dueAlerts([sub()], [ev("staff_alerted", 6), ev("submission_failed", 2)], NOW)).toHaveLength(1);
  });

  it("flags a lab hold only once it is a day old, and then once per day", () => {
    const held = sub({ status: "submitted", lab_status: "On hold - awaiting frame", lab_status_detail: "frame not received", lab_status_at: hoursAgo(STALE_HOURS - 1) });
    expect(dueAlerts([held], [], NOW)).toEqual([]);
    const stale = { ...held, lab_status_at: hoursAgo(STALE_HOURS + 2) };
    expect(dueAlerts([stale], [], NOW)).toEqual([{ submissionId: "s1", quoteId: "q1", kind: "stale", detail: "On hold - awaiting frame — frame not received" }]);
    expect(dueAlerts([stale], [ev("staff_alerted", 3)], NOW)).toEqual([]);
    expect(dueAlerts([stale], [ev("staff_alerted", STALE_HOURS + 1)], NOW)).toHaveLength(1);
  });

  it("ignores healthy, pending and cancelled orders", () => {
    const rows = [
      sub({ id: "a", status: "submitted", lab_status: "In production", lab_status_at: hoursAgo(80) }),
      sub({ id: "b", status: "pending_review" }),
      sub({ id: "c", status: "cancelled" }),
      sub({ id: "d", status: "submitted", lab_status: "Shipped", lab_status_at: hoursAgo(80) }),
    ];
    expect(dueAlerts(rows, [], NOW)).toEqual([]);
  });
});
