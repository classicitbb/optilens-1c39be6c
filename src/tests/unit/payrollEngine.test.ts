import { describe, expect, it } from "vitest";
import { calculatePayslip, rulesFor, type PayslipInput } from "@/features/admin/hr/payroll/engine";

// BRA's examples and the statutory arithmetic are checked to the cent; company
// policy (rounding to the dollar) is tested separately below.
const exact = (input: PayslipInput) => calculatePayslip({ ...input, statutoryRounding: "cent" });

describe("payroll engine", () => {
  // BRA Policy Note OGC No. 001/2026, monthly calculation examples.
  it("matches BRA example 1: $60,000 a year, lower band only", () => {
    const slip = exact({ periodStart: "2026-04-01", basePay: 5000, annualAllowances: 25000 });
    expect(slip.paye).toBe(335.42);
  });

  it("matches BRA example 2: $100,000 a year, both bands", () => {
    const slip = exact({ periodStart: "2026-04-01", basePay: 100000 / 12, annualAllowances: 25000 });
    expect(slip.paye).toBe(1052.09);
  });

  it("uses the old PAYE rates before April 2026", () => {
    expect(rulesFor("2026-03-01").payeLowerRate).toBe(0.125);
    expect(rulesFor("2026-04-01").payeLowerRate).toBe(0.115);
    expect(exact({ periodStart: "2026-01-01", basePay: 5000, annualAllowances: 25000 }).paye).toBe(364.58);
    expect(() => rulesFor("2025-12-01")).toThrow();
  });

  it("caps NIS at the insurable earnings ceiling", () => {
    expect(exact({ periodStart: "2026-04-01", basePay: 3000, annualAllowances: 25000 }).nis).toBe(330);
    expect(exact({ periodStart: "2026-04-01", basePay: 9000, annualAllowances: 25000 }).nis).toBe(589.6);
  });

  it("charges the R&R levy on gross unless exempt", () => {
    expect(exact({ periodStart: "2026-04-01", basePay: 4000, annualAllowances: 25000 }).rrLevy).toBe(10);
    expect(exact({ periodStart: "2026-04-01", basePay: 4000, annualAllowances: 25000, rrLevyExempt: true }).rrLevy).toBe(0);
  });

  it("charges no PAYE when allowances exceed pay", () => {
    expect(exact({ periodStart: "2026-04-01", basePay: 2000, annualAllowances: 25000 }).paye).toBe(0);
  });

  it("adds earnings to gross, keeps non-taxable earnings out of PAYE, and nets deductions", () => {
    const slip = exact({
      periodStart: "2026-04-01",
      basePay: 4000,
      annualAllowances: 25000,
      items: [
        { kind: "earning", label: "Car allowance", amount: 500 },
        { kind: "earning", label: "Meal allowance", amount: 100, taxable: false },
        { kind: "deduction", label: "Health insurance", amount: 120.5 },
        { kind: "deduction", label: "Pension", percent: 5 },
      ],
    });
    expect(slip.gross).toBe(4600);
    expect(slip.taxable).toBe(4500);
    expect(slip.otherDeductions).toBe(320.5);
    // 4500 - 2083.33 = 2416.67 at 11.5%
    expect(slip.paye).toBe(277.92);
    expect(slip.net).toBe(+(4600 - 506 - 277.92 - 11.5 - 320.5).toFixed(2));
  });

  it("never deducts more than a loan's remaining balance", () => {
    const slip = exact({
      periodStart: "2026-04-01",
      basePay: 4000,
      annualAllowances: 25000,
      items: [{ kind: "deduction", label: "Staff loan", amount: 300, loanBalance: 120, recurringItemId: "loan-1" }],
    });
    expect(slip.otherDeductions).toBe(120);
    expect(slip.lines.find((l) => l.recurringItemId === "loan-1")?.amount).toBe(120);
    expect(slip.warnings).toHaveLength(1);
  });

  it("pays fixed splits first and the remainder to the remainder line", () => {
    const slip = exact({
      periodStart: "2026-04-01",
      basePay: 3000,
      annualAllowances: 25000,
      splits: [
        { label: "Main account", method: "bank_transfer", isRemainder: true },
        { label: "Credit union", method: "third_party", amount: 400, isRemainder: false },
      ],
    });
    expect(slip.splits[0]).toEqual({ label: "Credit union", method: "third_party", amount: 400 });
    expect(slip.splits[1].amount).toBe(+(slip.net - 400).toFixed(2));
  });

  it("rounds NIS, PAYE and R&R to the nearest dollar by default, halves up", () => {
    // Exact: NIS 589.60, PAYE 1304.17, R&R 23.125 -> 23.13
    const slip = calculatePayslip({ periodStart: "2026-04-01", basePay: 9250, annualAllowances: 25000 });
    expect(slip.nis).toBe(590);
    expect(slip.paye).toBe(1304);
    expect(slip.rrLevy).toBe(23);
    expect(slip.net).toBe(9250 - 590 - 1304 - 23);
    // 2,500.00 * 0.25% = 6.25 -> 6; 2,200 * 0.25% = 5.50 -> 6
    expect(calculatePayslip({ periodStart: "2026-04-01", basePay: 2500, annualAllowances: 25000 }).rrLevy).toBe(6);
    expect(calculatePayslip({ periodStart: "2026-04-01", basePay: 2200, annualAllowances: 25000 }).rrLevy).toBe(6);
  });

  it("uses overridden deductions as typed and keeps the calculated figure", () => {
    const slip = calculatePayslip({
      periodStart: "2026-04-01",
      basePay: 9250,
      annualAllowances: 25000,
      items: [{ kind: "deduction", label: "Staff loan", amount: 300, loanBalance: 1000, recurringItemId: "loan-1" }],
      overrides: { paye: 1250.5, "item:loan-1": 0 },
    });
    const paye = slip.lines.find((l) => l.code === "paye");
    expect(paye).toMatchObject({ amount: 1250.5, calculated: 1304, deductionKey: "paye" });
    expect(slip.paye).toBe(1250.5);
    // A deduction overridden to zero stays on the slip so it can be reset.
    expect(slip.lines.find((l) => l.deductionKey === "item:loan-1")).toMatchObject({ amount: 0, calculated: 300 });
    expect(slip.otherDeductions).toBe(0);
    expect(slip.lines.find((l) => l.code === "nis")?.calculated).toBeUndefined();
  });
});
