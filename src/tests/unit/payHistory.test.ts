import { describe, expect, it } from "vitest";
import { isPlanError, planPayChange, type PayChangePlan } from "@/features/admin/hr/payHistory";
import type { Compensation } from "@/features/admin/hr/useEmployees";

const rec = (id: string, from: string, to: string | null, base = 3000): Compensation => ({
  id, employee_id: "e1", pay_type: "salary", pay_frequency: "monthly", base_amount: base, currency: "BBD",
  annual_personal_allowance: 0, annual_child_allowance: 0, annual_other_allowance: 0, pay_day: null,
  effective_from: from, effective_to: to, reason: null,
});

const plan = (rows: Compensation[], from: string, to?: string | null) => {
  const p = planPayChange(rows, from, to);
  if (isPlanError(p)) throw new Error(p.error);
  return p as PayChangePlan;
};

describe("planPayChange", () => {
  it("a later raise just closes the open record the day before", () => {
    const p = plan([rec("a", "2026-01-01", null)], "2026-07-01");
    expect(p.isCorrection).toBe(false);
    expect(p.to).toBeNull();
    expect(p.trim).toEqual([{ id: "a", values: { effective_to: "2026-06-30" } }]);
    expect(p.remove).toEqual([]);
  });

  it("pay that pre-dates the current record fills the gap up to where it starts", () => {
    const p = plan([rec("b", "2026-07-01", null)], "2026-03-01");
    expect(p.isCorrection).toBe(true);
    expect(p.to).toBe("2026-06-30");
    expect(p.trim).toEqual([]);
    expect(p.remove).toEqual([]);
  });

  it("starting on the same day as a record replaces it", () => {
    const rows = [rec("a", "2026-01-01", "2026-06-30"), rec("b", "2026-07-01", null)];
    const p = plan(rows, "2026-07-01");
    expect(p.isCorrection).toBe(true);
    expect(p.to).toBeNull();
    expect(p.remove.map((r) => r.id)).toEqual(["b"]);
    expect(p.trim).toEqual([]);
  });

  it("a correction inside an older record trims it back and stops before the next record", () => {
    const rows = [rec("a", "2025-01-01", "2026-06-30"), rec("b", "2026-07-01", null)];
    const p = plan(rows, "2026-03-01");
    expect(p.to).toBe("2026-06-30");
    expect(p.trim).toEqual([{ id: "a", values: { effective_to: "2026-02-28" } }]);
    expect(p.remove).toEqual([]);
  });

  it("an explicit window in the middle of a record splits it and keeps the tail", () => {
    const p = plan([rec("a", "2026-01-01", null)], "2026-03-01", "2026-04-30");
    expect(p.trim).toEqual([{ id: "a", values: { effective_to: "2026-02-28" } }]);
    expect(p.tail).toEqual([expect.objectContaining({ effective_from: "2026-05-01", effective_to: null })]);
  });

  it("an explicit window that ends inside a later record moves that record's start", () => {
    const rows = [rec("a", "2026-01-01", "2026-03-31"), rec("b", "2026-04-01", null)];
    const p = plan(rows, "2026-02-01", "2026-05-31");
    expect(p.trim).toEqual([
      { id: "a", values: { effective_to: "2026-01-31" } },
      { id: "b", values: { effective_from: "2026-06-01" } },
    ]);
    expect(p.remove).toEqual([]);
  });

  it("rejects a missing start and an end before the start", () => {
    expect(planPayChange([], "")).toHaveProperty("error");
    expect(planPayChange([], "2026-05-01", "2026-04-01")).toHaveProperty("error");
  });
});
