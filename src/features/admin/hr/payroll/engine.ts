// Monthly payroll calculation for Barbados: NIS, PAYE and the Resilience &
// Regeneration levy, plus recurring and one-off pay items and net pay splits.
// Pure functions over plain data so the same code runs in the browser and tests.
// All money is handled in integer cents and rounded half away from zero per step,
// the way BRA's worked examples round.

export interface StatutoryRules {
  /** First day these rules apply to a pay period (YYYY-MM-DD). */
  effectiveFrom: string;
  /** Employee NIS rate on insurable earnings, capped at the monthly ceiling. */
  nisRate: number;
  nisMonthlyCeiling: number;
  /** PAYE: lower rate up to the annual band of taxable income, higher rate above it. */
  payeLowerRate: number;
  payeUpperRate: number;
  payeAnnualBand: number;
  rrLevyRate: number;
  source: string;
}

// Newest last. Add a row when BRA or NIS publish a change; never edit a past row.
export const STATUTORY_RULES: StatutoryRules[] = [
  {
    effectiveFrom: "2026-01-01",
    nisRate: 0.11,
    nisMonthlyCeiling: 5360,
    payeLowerRate: 0.125,
    payeUpperRate: 0.285,
    payeAnnualBand: 50000,
    rrLevyRate: 0.0025,
    source: "Rates in use Jan–Mar 2026 (salary workbook)",
  },
  {
    // BRA Policy Note OGC No. 001/2026: rates cut for income year 2026, applied from April payroll.
    effectiveFrom: "2026-04-01",
    nisRate: 0.11,
    nisMonthlyCeiling: 5360,
    payeLowerRate: 0.115,
    payeUpperRate: 0.275,
    payeAnnualBand: 50000,
    rrLevyRate: 0.0025,
    source: "BRA Policy Note OGC No. 001/2026",
  },
];

export const rulesFor = (periodStart: string, rules = STATUTORY_RULES): StatutoryRules => {
  const match = [...rules].reverse().find((r) => r.effectiveFrom <= periodStart);
  if (!match) throw new Error(`No statutory rules cover ${periodStart}`);
  return match;
};

export const toCents = (amount: number) => Math.sign(amount) * Math.round(Math.abs(amount) * 100);
// Rates go through millionths so half-cent results round exactly instead of by float error.
const pct = (cents: number, rate: number) => {
  const scaled = Math.abs(cents) * Math.round(rate * 1_000_000);
  return Math.sign(cents) * Math.floor((scaled + 500_000) / 1_000_000);
};

export interface PayItemInput {
  /** Recurring item id, so approving a run can draw down loan balances. */
  recurringItemId?: string;
  kind: "earning" | "deduction";
  label: string;
  amount?: number | null;
  /** Percent of base pay, e.g. 5 for 5%. */
  percent?: number | null;
  taxable?: boolean;
  /** Remaining loan balance; the deduction never takes more than this. */
  loanBalance?: number | null;
}

export interface PaySplitInput {
  label: string;
  method: string;
  amount?: number | null;
  isRemainder: boolean;
}

/**
 * Amounts typed over calculated deductions, keyed by `deductionKey`. They are used
 * as given (no rounding), and the calculated figure is kept on the line for reset.
 */
export type DeductionOverrides = Record<string, number>;

export interface PayslipInput {
  periodStart: string;
  basePay: number;
  annualAllowances: number;
  rrLevyExempt?: boolean;
  items?: PayItemInput[];
  splits?: PaySplitInput[];
  overrides?: DeductionOverrides;
  /** Company policy: NIS, PAYE and R&R are rounded to the nearest dollar (halves up). "cent" keeps BRA's exact figures. */
  statutoryRounding?: "dollar" | "cent";
}

export interface PayslipLine {
  code: "base" | "earning" | "deduction" | "nis" | "paye" | "rr_levy";
  label: string;
  amount: number;
  taxable?: boolean;
  recurringItemId?: string;
  /** Set on deductions that can be overridden: the statutory code, or `item:<recurring item id>`. */
  deductionKey?: string;
  /** The calculated amount, present only when an override replaced it. */
  calculated?: number;
}

const roundToDollar = (cents: number) => Math.sign(cents) * Math.floor((Math.abs(cents) + 50) / 100) * 100;

export interface Payslip {
  rulesSource: string;
  gross: number;
  taxable: number;
  nis: number;
  paye: number;
  rrLevy: number;
  otherDeductions: number;
  net: number;
  lines: PayslipLine[];
  splits: { label: string; method: string; amount: number }[];
  warnings: string[];
}

/** PAYE for one month: taxable pay less a twelfth of the allowances, banded by a twelfth of the annual band. */
export const monthlyPayeCents = (taxableCents: number, annualAllowances: number, rules: StatutoryRules) => {
  const chargeable = taxableCents - toCents(annualAllowances / 12);
  if (chargeable <= 0) return 0;
  const band = toCents(rules.payeAnnualBand / 12);
  return pct(Math.min(chargeable, band), rules.payeLowerRate) + pct(Math.max(chargeable - band, 0), rules.payeUpperRate);
};

export const calculatePayslip = (input: PayslipInput, rules = rulesFor(input.periodStart)): Payslip => {
  const warnings: string[] = [];
  const baseCents = toCents(input.basePay);
  const overrides = input.overrides ?? {};
  const lines: (Omit<PayslipLine, "amount" | "calculated"> & { cents: number; calculatedCents?: number })[] = [
    { code: "base", label: "Base pay", cents: baseCents, taxable: true },
  ];

  const itemCents = (item: PayItemInput) =>
    item.amount != null ? toCents(item.amount) : pct(baseCents, (item.percent ?? 0) / 100);

  // Swaps in an override for a deduction, remembering what was calculated.
  const overridden = (key: string | undefined, cents: number) =>
    key && overrides[key] != null ? { cents: toCents(overrides[key]), calculatedCents: cents } : { cents };

  for (const item of input.items ?? []) {
    const key = item.kind === "deduction" && item.recurringItemId ? `item:${item.recurringItemId}` : undefined;
    const calc = overridden(key, itemCents(item));
    let cents = calc.cents;
    if (item.kind === "deduction" && item.loanBalance != null) {
      const balance = toCents(item.loanBalance);
      if (cents > balance) {
        cents = Math.max(balance, 0);
        warnings.push(`${item.label}: limited to the remaining loan balance`);
      }
    }
    // An overridden deduction stays on the slip even at zero, so it can be reset.
    if (cents === 0 && calc.calculatedCents == null) continue;
    lines.push({
      code: item.kind,
      label: item.label,
      cents,
      calculatedCents: calc.calculatedCents,
      taxable: item.kind === "earning" ? item.taxable !== false : undefined,
      recurringItemId: item.recurringItemId,
      deductionKey: key,
    });
  }

  const earnings = lines.filter((l) => l.code === "base" || l.code === "earning");
  const grossCents = earnings.reduce((sum, l) => sum + l.cents, 0);
  const taxableCents = earnings.filter((l) => l.taxable).reduce((sum, l) => sum + l.cents, 0);

  const round = input.statutoryRounding === "cent" ? (c: number) => c : roundToDollar;
  const nis = overridden("nis", round(pct(Math.min(grossCents, toCents(rules.nisMonthlyCeiling)), rules.nisRate)));
  const paye = overridden("paye", round(monthlyPayeCents(taxableCents, input.annualAllowances, rules)));
  const rr = overridden("rr_levy", input.rrLevyExempt ? 0 : round(pct(grossCents, rules.rrLevyRate)));
  const nisCents = nis.cents;
  const payeCents = paye.cents;
  const rrCents = rr.cents;
  lines.push(
    { code: "nis", label: "NIS", ...nis, deductionKey: "nis" },
    { code: "paye", label: "PAYE", ...paye, deductionKey: "paye" },
    { code: "rr_levy", label: "Resilience & Regeneration levy", ...rr, deductionKey: "rr_levy" },
  );

  const otherCents = lines.filter((l) => l.code === "deduction").reduce((sum, l) => sum + l.cents, 0);
  const netCents = grossCents - nisCents - payeCents - rrCents - otherCents;
  if (netCents < 0) warnings.push("Net pay is negative");

  // Fixed splits are paid first in order; the remainder line takes what is left.
  const splits: Payslip["splits"] = [];
  let left = Math.max(netCents, 0);
  for (const split of (input.splits ?? []).filter((s) => !s.isRemainder)) {
    const want = toCents(split.amount ?? 0);
    const paid = Math.min(want, left);
    if (paid < want) warnings.push(`${split.label}: net pay too low for the full split amount`);
    splits.push({ label: split.label, method: split.method, amount: paid / 100 });
    left -= paid;
  }
  const remainder = (input.splits ?? []).find((s) => s.isRemainder);
  if (remainder) splits.push({ label: remainder.label, method: remainder.method, amount: left / 100 });
  else if (left > 0 && splits.length > 0) warnings.push("No remainder split: part of net pay is unassigned");

  return {
    rulesSource: rules.source,
    gross: grossCents / 100,
    taxable: taxableCents / 100,
    nis: nisCents / 100,
    paye: payeCents / 100,
    rrLevy: rrCents / 100,
    otherDeductions: otherCents / 100,
    net: netCents / 100,
    lines: lines.map(({ cents, calculatedCents, ...l }) =>
      calculatedCents == null ? { ...l, amount: cents / 100 } : { ...l, amount: cents / 100, calculated: calculatedCents / 100 },
    ),
    splits,
    warnings,
  };
};
