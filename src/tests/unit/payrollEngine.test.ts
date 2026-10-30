import { describe, expect, it } from "vitest";
import { calculatePayslip, rulesFor } from "@/features/admin/hr/payroll/engine";

describe("payroll engine", () => {
  // BRA Policy Note OGC No. 001/2026, monthly calculation examples.
  it("matches BRA example 1: $60,000 a year, lower band only", () => {
    const slip = calculatePayslip({ periodStart: "2026-04-01", basePay: 5000, annualAllowances: 25000 });
    expect(slip.paye).toBe(335.42);
  });

  it("matches BRA example 2: $100,000 a year, both bands", () => {
    const slip = calculatePayslip({ periodStart: "2026-04-01", basePay: 100000 / 12, annualAllowances: 25000 });
    expect(slip.paye).toBe(1052.09);
  });

  it("uses the old PAYE rates before April 2026", () => {
    expect(rulesFor("2026-03-01").payeLowerRate).toBe(0.125);
    expect(rulesFor("2026-04-01").payeLowerRate).toBe(0.115);
    expect(calculatePayslip({ periodStart: "2026-01-01", basePay: 5000, annualAllowances: 25000 }).paye).toBe(364.58);
    expect(() => rulesFor("2025-12-01")).toThrow();
  });

  it("caps NIS at the insurable earnings ceiling", () => {
    expect(calculatePayslip({ periodStart: "2026-04-01", basePay: 3000, annualAllowances: 25000 }).nis).toBe(330);
    expect(calculatePayslip({ periodStart: "2026-04-01", basePay: 9000, annualAllowances: 25000 }).nis).toBe(589.6);
  });

  it("charges the R&R levy on gross unless exempt", () => {
    expect(calculatePayslip({ periodStart: "2026-04-01", basePay: 4000, annualAllowances: 25000 }).rrLevy).toBe(10);
    expect(calculatePayslip({ periodStart: "2026-04-01", basePay: 4000, annualAllowances: 25000, rrLevyExempt: true }).rrLevy).toBe(0);
  });

  it("charges no PAYE when allowances exceed pay", () => {
    expect(calculatePayslip({ periodStart: "2026-04-01", basePay: 2000, annualAllowances: 25000 }).paye).toBe(0);
  });

  it("adds earnings to gross, keeps non-taxable earnings out of PAYE, and nets deductions", () => {
    const slip = calculatePayslip({
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
    const slip = calculatePayslip({
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
    const slip = calculatePayslip({
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
});
