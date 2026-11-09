import { describe, expect, it } from "vitest";
import { ageAtYearEnd, annualTax, EMPTY_CLAIMS, incomeTax, taxRulesFor } from "@/features/admin/hr/tax/annualTax";

const rules = taxRulesFor(2026);

describe("annual income tax", () => {
  it("taxes the first $50,000 at 11.5% and the rest at 27.5% (income year 2026)", () => {
    expect(incomeTax(35000, rules)).toBe(4025);
    expect(incomeTax(50000, rules)).toBe(5750);
    expect(incomeTax(75000, rules)).toBe(5750 + 6875);
    expect(incomeTax(-10, rules)).toBe(0);
  });

  it("agrees with BRA's annual figure for a $60,000 salary", () => {
    // BRA example 1: $5,000 a month with the $25,000 allowance = $335.42 PAYE a month.
    const r = annualTax({ year: 2026, employmentIncome: 60000, payeWithheld: 335.42 * 12, age: 35, claims: EMPTY_CLAIMS });
    expect(r.taxableIncome).toBe(35000);
    expect(r.tax).toBe(4025);
    expect(r.refund).toBe(0.04);
  });

  it("caps deductions, applies allowances and reports a refund when PAYE was over-withheld", () => {
    const r = annualTax({
      year: 2026,
      employmentIncome: 111000,
      payeWithheld: 16000,
      age: 45,
      claims: { ...EMPTY_CLAIMS, tradeUnionDues: 400, medicalExam: 900, spouseNoIncome: true },
    });
    expect(r.deductions).toEqual([
      { label: "Trade union dues", amount: 240 },
      { label: "Medical examination", amount: 750 },
    ]);
    // 111,000 - 990 - 25,000 - 3,000
    expect(r.taxableIncome).toBe(82010);
    expect(r.tax).toBe(5750 + 32010 * 0.275);
    expect(r.refund).toBe(+(16000 - r.tax).toFixed(2));
    expect(r.marginalRate).toBe(0.275);
  });

  it("uses the pensioner allowance instead of the personal allowance", () => {
    const r = annualTax({ year: 2026, employmentIncome: 80000, payeWithheld: 0, age: 65, claims: { ...EMPTY_CLAIMS, pensionerOver60: true } });
    expect(r.allowances).toEqual([{ label: "Pensioner allowance (over 60)", amount: 75000 }]);
    expect(r.taxableIncome).toBe(5000);
  });

  it("lists unclaimed reliefs with their saving at the marginal rate, skipping ones that don't apply", () => {
    const young = annualTax({ year: 2026, employmentIncome: 60000, payeWithheld: 0, age: 30, claims: EMPTY_CLAIMS });
    const keys = young.savings.map((s) => s.key);
    expect(keys).not.toContain("medical_exam");
    expect(young.savings.find((s) => s.key === "trade_union")?.saving).toBe(27.6);
    expect(young.savings.find((s) => s.key === "spouse")?.saving).toBe(345);
    // No tax payable means nothing to save.
    expect(annualTax({ year: 2026, employmentIncome: 20000, payeWithheld: 0, age: 50, claims: EMPTY_CLAIMS }).savings).toEqual([]);
  });

  it("works out age at the end of the tax year", () => {
    expect(ageAtYearEnd("1986-12-31", 2026)).toBe(40);
    expect(ageAtYearEnd(null, 2026)).toBeNull();
  });
});
