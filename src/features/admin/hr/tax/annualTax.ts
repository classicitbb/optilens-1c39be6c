// Annual Barbados personal income tax for an employee, compared with PAYE withheld,
// plus the claims they have not made yet and what each would save. Pure functions
// over plain numbers so the figures can be unit-tested against the rules.

export interface TaxYearRules {
  year: number;
  lowerRate: number;
  upperRate: number;
  /** Taxable income taxed at the lower rate. */
  band: number;
  personalAllowance: number;
  /** Replaces the personal allowance for a resident over 60 receiving a pension. */
  pensionerAllowance: number;
  spouseAllowance: number;
  tradeUnionCap: number;
  /** Annual medical examination, age 40 and over. */
  medicalExamCap: number;
  /** Bonus taken as employer shares: the lower of this share of the bonus and the cap. */
  bonusSharesRate: number;
  bonusSharesCap: number;
  source: string;
}

// Newest last; add a row when the rules change, never edit a past row.
export const TAX_YEAR_RULES: TaxYearRules[] = [
  {
    year: 2026,
    lowerRate: 0.115,
    upperRate: 0.275,
    band: 50000,
    personalAllowance: 25000,
    pensionerAllowance: 75000,
    spouseAllowance: 3000,
    tradeUnionCap: 240,
    medicalExamCap: 750,
    bonusSharesRate: 0.75,
    bonusSharesCap: 7500,
    source: "BRA Policy Note OGC No. 001/2026; PwC Worldwide Tax Summaries, Barbados (reviewed Oct 2026)",
  },
];

export const taxRulesFor = (year: number) => {
  const rules = [...TAX_YEAR_RULES].reverse().find((r) => r.year <= year);
  if (!rules) throw new Error(`No income tax rules cover ${year}`);
  return rules;
};

/** What HR or the employee has recorded for the year. Amounts are what was paid, before caps. */
export interface TaxClaims {
  tradeUnionDues: number;
  medicalExam: number;
  charitable: number;
  employmentExpenses: number;
  bonusInShares: number;
  otherIncome: number;
  spouseNoIncome: boolean;
  pensionerOver60: boolean;
}

export const EMPTY_CLAIMS: TaxClaims = {
  tradeUnionDues: 0,
  medicalExam: 0,
  charitable: 0,
  employmentExpenses: 0,
  bonusInShares: 0,
  otherIncome: 0,
  spouseNoIncome: false,
  pensionerOver60: false,
};

export interface AnnualTaxInput {
  year: number;
  /** Taxable employment income for the year (actual plus projected). */
  employmentIncome: number;
  /** PAYE withheld for the year (actual plus projected). */
  payeWithheld: number;
  /** Age at the end of the year, if known; gates the medical exam deduction. */
  age: number | null;
  claims: TaxClaims;
}

export interface TaxSaving {
  key: string;
  title: string;
  detail: string;
  /** Tax saved at the employee's marginal rate. */
  saving: number;
}

export interface AnnualTaxResult {
  rules: TaxYearRules;
  assessableIncome: number;
  deductions: { label: string; amount: number }[];
  allowances: { label: string; amount: number }[];
  taxableIncome: number;
  tax: number;
  payeWithheld: number;
  /** Positive: refund due to the employee. Negative: tax still owed. */
  refund: number;
  marginalRate: number;
  savings: TaxSaving[];
}

const cents = (n: number) => Math.round(n * 100) / 100;

export const incomeTax = (taxable: number, rules: TaxYearRules) =>
  taxable <= 0 ? 0 : cents(Math.min(taxable, rules.band) * rules.lowerRate + Math.max(taxable - rules.band, 0) * rules.upperRate);

export const annualTax = (input: AnnualTaxInput): AnnualTaxResult => {
  const rules = taxRulesFor(input.year);
  const c = input.claims;
  const ageKnownUnder40 = input.age != null && input.age < 40;

  const deductions = [
    { label: "Trade union dues", amount: Math.min(c.tradeUnionDues, rules.tradeUnionCap) },
    { label: "Medical examination", amount: ageKnownUnder40 ? 0 : Math.min(c.medicalExam, rules.medicalExamCap) },
    { label: "Employment expenses", amount: c.employmentExpenses },
    { label: "Bonus taken as employer shares", amount: Math.min(c.bonusInShares * rules.bonusSharesRate, rules.bonusSharesCap) },
    { label: "Charitable gifts", amount: c.charitable },
  ].filter((d) => d.amount > 0);

  const allowances = [
    c.pensionerOver60
      ? { label: "Pensioner allowance (over 60)", amount: rules.pensionerAllowance }
      : { label: "Personal allowance", amount: rules.personalAllowance },
    ...(c.spouseNoIncome ? [{ label: "Spouse allowance", amount: rules.spouseAllowance }] : []),
  ];

  const assessableIncome = cents(input.employmentIncome + c.otherIncome);
  const before = assessableIncome - deductions.reduce((s, d) => s + d.amount, 0);
  const taxableIncome = cents(Math.max(before - allowances.reduce((s, a) => s + a.amount, 0), 0));
  const tax = incomeTax(taxableIncome, rules);
  const marginalRate = taxableIncome <= 0 ? 0 : taxableIncome > rules.band ? rules.upperRate : rules.lowerRate;

  // Unclaimed reliefs and what they would be worth at the marginal rate.
  const savings: TaxSaving[] = [];
  const add = (key: string, title: string, detail: string, relief: number) => {
    const saving = cents(incomeTax(taxableIncome, rules) - incomeTax(Math.max(taxableIncome - relief, 0), rules));
    if (saving > 0) savings.push({ key, title, detail, saving });
  };
  if (c.tradeUnionDues < rules.tradeUnionCap)
    add("trade_union", "Trade union dues", `Union or statutory association subscriptions are deductible up to $${rules.tradeUnionCap} a year.`, rules.tradeUnionCap - c.tradeUnionDues);
  if (!ageKnownUnder40 && c.medicalExam < rules.medicalExamCap)
    add("medical_exam", "Annual medical examination", `From age 40, the cost of a yearly medical is deductible up to $${rules.medicalExamCap}.`, rules.medicalExamCap - c.medicalExam);
  if (!c.spouseNoIncome)
    add("spouse", "Spouse allowance", `$${rules.spouseAllowance.toLocaleString()} if a spouse with no income lives with or is supported by the employee.`, rules.spouseAllowance);
  savings.sort((a, b) => b.saving - a.saving);

  return {
    rules,
    assessableIncome,
    deductions,
    allowances,
    taxableIncome,
    tax,
    payeWithheld: cents(input.payeWithheld),
    refund: cents(input.payeWithheld - tax),
    marginalRate,
    savings,
  };
};

/** Age on 31 December of the tax year: every birthday in the year has passed by then. */
export const ageAtYearEnd = (dateOfBirth: string | null, year: number) =>
  dateOfBirth ? year - Number(dateOfBirth.slice(0, 4)) : null;
