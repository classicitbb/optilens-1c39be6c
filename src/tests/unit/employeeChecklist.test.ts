import { describe, expect, it } from "vitest";
import { checklistFor, type ChecklistContext, type Dismissal } from "@/features/admin/hr/checklist";
import type { Employee } from "@/features/admin/hr/useEmployees";

const employee = (over: Partial<Employee> = {}): Employee => ({
  id: "e1", user_id: null, employee_no: "7", first_name: "A", last_name: "B", preferred_name: null,
  date_of_birth: "1990-01-01", email: "a@b.c", phone: "123", address: "1 Road", job_title: "Clerk", department: "Ops",
  department_id: "d1", manager_id: null, employment_type: "full_time", status: "active", hire_date: "2020-01-01",
  termination_date: null, termination_reason: null, tax_code: null, rr_levy_exempt: false, contact_id: null,
  created_at: "", updated_at: "", ...over,
});
const ctx: ChecklistContext = { hasCurrentPay: true, hasPayDay: true, hasManager: true };
const dismissal = (key: string, until: string | null): Dismissal => ({ id: key, employee_id: "e1", item_key: key, dismissed_until: until });
const today = "2026-11-11";

describe("checklistFor", () => {
  it("is empty for a complete record", () => {
    expect(checklistFor(employee(), ctx, [], today).open).toEqual([]);
  });

  it("lists blank details and missing pay set-up", () => {
    const state = checklistFor(employee({ phone: null, address: " " }), { hasCurrentPay: false, hasPayDay: false, hasManager: false }, [], today);
    expect(state.open.map((i) => i.key)).toEqual(["phone", "address", "manager", "pay"]);
  });

  it("asks for a pay day only once pay exists", () => {
    expect(checklistFor(employee(), { ...ctx, hasPayDay: false }, [], today).open.map((i) => i.key)).toEqual(["pay_day"]);
  });

  it("hides a snoozed item until its date has passed, and an ignored one for good", () => {
    const e = employee({ phone: null, email: null });
    const withSnooze = [dismissal("phone", "2026-11-18"), dismissal("email", null)];
    const state = checklistFor(e, ctx, withSnooze, today);
    expect(state.open).toEqual([]);
    expect(state.later.map((i) => i.key)).toEqual(["phone"]);
    expect(state.ignored.map((i) => i.key)).toEqual(["email"]);
    const later = checklistFor(e, ctx, withSnooze, "2026-11-19");
    expect(later.open.map((i) => i.key)).toEqual(["phone"]);
    expect(later.ignored.map((i) => i.key)).toEqual(["email"]);
  });

  it("only asks former staff for a termination date", () => {
    const state = checklistFor(employee({ status: "terminated", phone: null }), ctx, [], today);
    expect(state.open.map((i) => i.key)).toEqual(["termination_date"]);
  });
});
