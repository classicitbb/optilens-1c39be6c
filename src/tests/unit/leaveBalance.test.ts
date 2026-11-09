import { describe, expect, it } from "vitest";
import {
  anniversaryGrants,
  leaveBalance,
  tierDays,
  unpaidLeaveInPeriod,
  workingDaysBetween,
  type LeaveRequest,
  type LeaveType,
} from "@/features/admin/hr/leave/leaveBalance";

const WEEKDAYS = [1, 2, 3, 4, 5];
const policy = { tracking_from: "2026-01-01", work_days: WEEKDAYS };

const type = (over: Partial<LeaveType>): LeaveType => ({
  id: "vac",
  code: "vacation",
  name: "Vacation",
  basis: "per_year",
  entitlement_tiers: [{ min_years: 1, days: 15 }, { min_years: 5, days: 20 }],
  carry_over_max_days: null,
  payroll_effect: "paid",
  certificate_after_days: null,
  legal_basis: null,
  notes: null,
  active: true,
  sort_order: 0,
  ...over,
});

const request = (over: Partial<LeaveRequest>): LeaveRequest => ({
  id: "r1",
  employee_id: "e1",
  leave_type_id: "vac",
  start_date: "2026-06-01",
  end_date: "2026-06-05",
  days: 5,
  status: "approved",
  reason: null,
  decision_note: null,
  decided_at: null,
  created_at: "2026-05-01",
  ...over,
});

describe("leave balances", () => {
  it("counts working days, skipping weekends", () => {
    // Fri 30 Oct 2026 to Tue 3 Nov 2026
    expect(workingDaysBetween("2026-10-30", "2026-11-03", WEEKDAYS)).toBe(3);
  });

  it("gives three weeks after each year and four weeks from the fifth (Holidays with Pay Act)", () => {
    const tiers = type({}).entitlement_tiers;
    expect(tierDays(tiers, 0)).toBe(0);
    expect(tierDays(tiers, 1)).toBe(15);
    expect(tierDays(tiers, 4)).toBe(15);
    expect(tierDays(tiers, 5)).toBe(20);
    expect(anniversaryGrants(tiers, "2021-03-15", "2026-01-01", "2026-10-30")).toEqual([{ date: "2026-03-15", days: 20, years: 5 }]);
  });

  it("adds grants and adjustments, takes approved leave, and reports pending and the next grant", () => {
    const b = leaveBalance(
      type({}),
      { id: "e1", hire_date: "2023-03-15" },
      policy,
      [request({}), request({ id: "r2", status: "requested", start_date: "2026-11-02", end_date: "2026-11-03", days: 2 }), request({ id: "r3", status: "declined" })],
      [{ id: "a1", employee_id: "e1", leave_type_id: "vac", days: 4, effective_date: "2026-01-01", reason: "Opening balance", created_at: "2026-01-01" }],
      "2026-10-30",
    );
    // 4 opening + 15 on 15 Mar (3rd anniversary) - 5 taken
    expect(b.available).toBe(14);
    expect(b.taken).toBe(5);
    expect(b.pending).toBe(2);
    expect(b.next).toEqual({ date: "2027-03-15", days: 15 });
  });

  it("cuts unused days to the carry-over cap before each new grant", () => {
    const b = leaveBalance(
      type({ carry_over_max_days: 5 }),
      { id: "e1", hire_date: "2023-03-15" },
      policy,
      [],
      [{ id: "a1", employee_id: "e1", leave_type_id: "vac", days: 12, effective_date: "2026-01-01", reason: "Opening balance", created_at: "2026-01-01" }],
      "2026-10-30",
    );
    expect(b.available).toBe(20);
  });

  it("charges unpaid and NIS-paid leave to the pay period it falls in", () => {
    const types = [type({}), type({ id: "unp", code: "unpaid", basis: "none", payroll_effect: "unpaid" })];
    // Thu 29 Oct to Tue 3 Nov: 2 working days in October, 2 in November.
    const r = request({ leave_type_id: "unp", start_date: "2026-10-29", end_date: "2026-11-03", days: 4 });
    const october = unpaidLeaveInPeriod("e1", [r, request({})], types, policy, "2026-10-01", "2026-10-31");
    expect(october.map((o) => [o.type.code, o.days])).toEqual([["unpaid", 2]]);
    expect(unpaidLeaveInPeriod("e1", [r], types, policy, "2026-11-01", "2026-11-30")[0].days).toBe(2);
    expect(unpaidLeaveInPeriod("e1", [{ ...r, status: "requested" }], types, policy, "2026-10-01", "2026-10-31")).toEqual([]);
  });
});
