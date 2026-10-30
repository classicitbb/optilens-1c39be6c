// Reads and checks the opening-balance import CSV before anything is saved.
// One row per asset; balances come from QBO at the cut-over, the rest from the
// accountant's schedule. See docs/ASSET_REGISTER_PLAN.md §7.
import { parseCsv, toCents } from "./engine";

export const IMPORT_COLUMNS = [
  "name",
  "class",
  "acquired_on",
  "in_service_on",
  "cost",
  "opening_accum_dep",
  "useful_life_months",
  "expense_target",
  "legacy_qbo_account",
  "serial_no",
  "location",
  "notes",
] as const;

export interface ImportRow {
  line: number;
  name: string;
  class: string;
  acquired_on: string | null;
  in_service_on: string | null;
  cost: number;
  opening_accum_dep: number;
  useful_life_months: number;
  expense_target: "cogs" | "overhead";
  legacy_qbo_account: string | null;
  serial_no: string | null;
  location: string | null;
  notes: string | null;
  errors: string[];
  warnings: string[];
}

const blank = (v: string | undefined) => (v == null || v.trim() === "" ? null : v.trim());
const amount = (v: string | undefined) => {
  const text = blank(v)?.replace(/[$,\s]/g, "");
  if (!text) return 0;
  const negative = /^\(.*\)$/.test(text);
  const n = Number(text.replace(/[()]/g, ""));
  return Number.isFinite(n) ? (negative ? -n : n) : NaN;
};
/** Accepts 96, "96", "8 Yrs" or "8 years". */
export const lifeMonths = (v: string | undefined) => {
  const text = blank(v)?.toLowerCase();
  if (!text) return NaN;
  const years = text.match(/^([\d.]+)\s*(y|yr|yrs|year|years)$/);
  if (years) return Math.round(Number(years[1]) * 12);
  return Number(text);
};
const isoDate = (v: string | undefined) => {
  const text = blank(v);
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "invalid";
};

export const parseImport = (csv: string, classNames: string[]): ImportRow[] => {
  const [header, ...body] = parseCsv(csv);
  if (!header) return [];
  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = ["name", "class", "cost", "opening_accum_dep", "useful_life_months"].filter((c) => !cols.includes(c));
  if (missing.length) throw new Error(`The file is missing these columns: ${missing.join(", ")}`);
  const known = new Map(classNames.map((n) => [n.toLowerCase(), n]));
  const seen = new Map<string, number>();

  return body.map((cells, i) => {
    const get = (col: (typeof IMPORT_COLUMNS)[number]) => cells[cols.indexOf(col)];
    const errors: string[] = [];
    const warnings: string[] = [];
    const name = blank(get("name")) ?? "";
    const className = known.get((blank(get("class")) ?? "").toLowerCase());
    const cost = amount(get("cost"));
    const accum = amount(get("opening_accum_dep"));
    const life = lifeMonths(get("useful_life_months"));
    const target = (blank(get("expense_target")) ?? "overhead").toLowerCase();
    const acquired = isoDate(get("acquired_on"));
    const inService = isoDate(get("in_service_on"));

    if (!name) errors.push("No name");
    if (!className) errors.push(`Unknown class "${blank(get("class")) ?? ""}"`);
    if (Number.isNaN(cost)) errors.push("Cost is not a number");
    else if (cost <= 0) errors.push("Cost must be more than zero");
    if (Number.isNaN(accum)) errors.push("Opening depreciation is not a number");
    else if (accum < 0) errors.push("Opening depreciation is negative");
    else if (toCents(accum) > toCents(cost)) errors.push("Depreciation is more than cost (negative book value)");
    if (!Number.isInteger(life) || life <= 0) errors.push("Useful life must be a whole number of months, or years like \"8 Yrs\"");
    if (target !== "cogs" && target !== "overhead") errors.push('Expense target must be "cogs" or "overhead"');
    if (acquired === "invalid" || inService === "invalid") errors.push("Dates must be YYYY-MM-DD");
    if (!acquired && !inService) warnings.push("No purchase date; the cut-over date will be used");
    if (!blank(get("legacy_qbo_account"))) warnings.push("No QBO account; it will be left out of the reclass journal");
    if (cost > 0 && toCents(accum) === toCents(cost)) warnings.push("Fully depreciated; confirm it still exists");

    const key = `${name.toLowerCase()}|${(blank(get("legacy_qbo_account")) ?? "").toLowerCase()}`;
    if (seen.has(key)) warnings.push(`Same name and QBO account as line ${seen.get(key)}`);
    else seen.set(key, i + 2);

    return {
      line: i + 2,
      name,
      class: className ?? blank(get("class")) ?? "",
      acquired_on: acquired === "invalid" ? null : acquired,
      in_service_on: inService === "invalid" ? null : inService,
      cost,
      opening_accum_dep: accum,
      useful_life_months: life,
      expense_target: target as ImportRow["expense_target"],
      legacy_qbo_account: blank(get("legacy_qbo_account")),
      serial_no: blank(get("serial_no")),
      location: blank(get("location")),
      notes: blank(get("notes")),
      errors,
      warnings,
    };
  });
};

export interface ReconcileRow {
  account: string;
  cost: number;
  accumDep: number;
  nbv: number;
}

/** Imported totals per QBO cost account, to tick against QBO's balances at the cut-over. */
export const totalsByAccount = (rows: ImportRow[], accountOfClass: Map<string, string>): ReconcileRow[] => {
  const totals = new Map<string, { cost: number; accum: number }>();
  for (const r of rows) {
    const account = accountOfClass.get(r.class) ?? r.class;
    const t = totals.get(account) ?? { cost: 0, accum: 0 };
    t.cost += toCents(r.cost);
    t.accum += toCents(r.opening_accum_dep);
    totals.set(account, t);
  }
  return [...totals.entries()]
    .map(([account, t]) => ({ account, cost: t.cost / 100, accumDep: t.accum / 100, nbv: (t.cost - t.accum) / 100 }))
    .sort((a, b) => a.account.localeCompare(b.account));
};
