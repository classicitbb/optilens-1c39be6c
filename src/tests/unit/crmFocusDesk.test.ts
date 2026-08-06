import { describe, expect, it } from "vitest";
import { dueDateForBucket, getFocusBucket, isActivityOverdue, matchesPreset } from "@/features/admin/crm/focusDesk";
import type { CrmActivity } from "@/features/admin/crm/hooks/useActivities";

const NOW = new Date("2026-08-06T12:00:00-04:00");
const task = (overrides: Partial<CrmActivity> = {}): CrmActivity => ({
  id: "task-1", activity_type: "Call customer", type: "call", task_channel: "todo", content: null,
  status: "planned", priority: "normal", due_at: null, opportunity_id: null, contact_id: null,
  owner_id: "owner-1", created_by: "owner-1", created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
  participants: [], automations: [], automation_runs: [], ...overrides,
});

describe("CRM Focus Desk scheduling", () => {
  it("places unscheduled, dated, and waiting tasks in operational buckets", () => {
    expect(getFocusBucket(task(), NOW)).toBe("inbox");
    expect(getFocusBucket(task({ due_at: "2026-08-06T16:00:00-04:00" }), NOW)).toBe("today");
    expect(getFocusBucket(task({ due_at: "2026-08-07T16:00:00-04:00" }), NOW)).toBe("this_week");
    expect(getFocusBucket(task({ due_at: "2026-08-20T16:00:00-04:00" }), NOW)).toBe("later");
    expect(getFocusBucket(task({ status: "waiting", due_at: "2026-08-06T16:00:00-04:00" }), NOW)).toBe("waiting");
  });

  it("keeps completed work off the active board and overdue work on the priority shelf", () => {
    expect(getFocusBucket(task({ status: "completed" }), NOW)).toBeNull();
    expect(isActivityOverdue(task({ due_at: "2026-08-05T16:00:00-04:00" }), NOW)).toBe(true);
    expect(isActivityOverdue(task({ status: "completed", due_at: "2026-08-05T16:00:00-04:00" }), NOW)).toBe(false);
  });

  it("distinguishes ownership from helping", () => {
    const helping = task({ owner_id: "owner-2", participants: [{ user_id: "owner-1", role: "helper", name: "Alex" }] });
    expect(matchesPreset(task(), "my_focus", "owner-1", NOW)).toBe(true);
    expect(matchesPreset(helping, "helping", "owner-1", NOW)).toBe(true);
    expect(matchesPreset(helping, "my_focus", "owner-1", NOW)).toBe(false);
  });

  it("translates board drops into stable due-date choices", () => {
    expect(dueDateForBucket("inbox", NOW)).toBeNull();
    expect(dueDateForBucket("waiting", NOW)).toBeNull();
    expect(new Date(dueDateForBucket("today", NOW)!).getDate()).toBe(6);
    expect(new Date(dueDateForBucket("later", NOW)!).getDate()).toBe(20);
  });
});
