// Fixed asset depreciation, journals and the roll-forward. Pure functions over
// plain data so the same code runs in the browser and in tests.
// Money is handled in integer cents. See docs/ASSET_REGISTER_PLAN.md §4.

export type DepreciationMethod = "straight_line" | "declining_balance";
export type Convention = "full_year" | "full_month" | "mid_month";
export type ExpenseTarget = "cogs" | "overhead";
export type AssetStatus = "draft" | "in_service" | "disposed" | "written_off";

export interface BookInput {
  method: DepreciationMethod;
  usefulLifeMonths: number;
  residualValue: number;
  /** Annual rate for declining balance, e.g. 25 for 25%. */
  ratePct?: number | null;
  convention: Convention;
  /** Accumulated depreciation to date: opening balance plus every approved run. */
  accumDep: number;
  /** Cut-over date for imported assets; null for assets added in the register. */
  openingAsOf?: string | null;
}

export interface AssetInput {
  id: string;
  classId: string;
  cost: number;
  inServiceOn: string | null;
  status: AssetStatus;
  expenseTarget: ExpenseTarget;
  book: BookInput;
}

export const toCents = (amount: number) => Math.sign(amount) * Math.round(Math.abs(amount) * 100);
const fromCents = (cents: number) => cents / 100;

const ym = (date: string) => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) });
/** Months from a's month to b's month: same month is 0. */
const monthsBetween = (a: string, b: string) => {
  const x = ym(a);
  const z = ym(b);
  return (z.y - x.y) * 12 + (z.m - x.m);
};

export const periodLabel = (period: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period.slice(0, 7)}-01T00:00:00Z`));

/**
 * Months of depreciation due by the end of `period` under the convention.
 * full_year charges the whole first calendar year, so by December of the
 * purchase year twelve months are due whatever the purchase month.
 */
const monthsDue = (inServiceOn: string, period: string, convention: Convention) => {
  if (convention === "full_year") return (ym(period).y - ym(inServiceOn).y) * 12 + ym(period).m;
  const months = monthsBetween(inServiceOn, period) + 1;
  return convention === "mid_month" ? months - 0.5 : months;
};

/** Depreciation to charge for one month, in currency units. Zero when nothing is due. */
export const monthlyCharge = (asset: AssetInput, period: string): number => {
  const { book } = asset;
  if (asset.status !== "in_service" || !asset.inServiceOn) return 0;
  if (monthsBetween(asset.inServiceOn, period) < 0) return 0;
  if (book.openingAsOf && monthsBetween(book.openingAsOf, period) <= 0) return 0;

  const cost = toCents(asset.cost);
  const accum = toCents(book.accumDep);
  const depreciable = cost - toCents(book.residualValue);
  const remaining = depreciable - accum;
  if (remaining <= 0) return 0;

  let charge: number;
  if (book.method === "declining_balance") {
    // Switch to straight line over the remaining life once that charges more,
    // so the asset still reaches its residual value at the end of its life.
    const nbv = cost - accum;
    const declining = Math.round((nbv * (book.ratePct ?? 0)) / 100 / 12);
    const monthsLeft = Math.max(1, book.usefulLifeMonths - monthsBetween(asset.inServiceOn, period));
    charge = Math.max(declining, Math.round(remaining / monthsLeft));
  } else if (book.openingAsOf) {
    // Imported assets carry on at a twelfth of the annual charge from their opening balance.
    charge = Math.round(depreciable / book.usefulLifeMonths);
  } else {
    // Charge whatever brings the total up to what is due by this month,
    // which also catches up an asset entered after its first month.
    const due = Math.min(monthsDue(asset.inServiceOn, period, book.convention), book.usefulLifeMonths);
    charge = Math.round((depreciable * due) / book.usefulLifeMonths) - accum;
  }
  return fromCents(Math.max(0, Math.min(charge, remaining)));
};

export interface RunLine {
  assetId: string;
  classId: string;
  expenseTarget: ExpenseTarget;
  amount: number;
}

export const buildRunLines = (assets: AssetInput[], period: string): RunLine[] =>
  assets.flatMap((a) => {
    const amount = monthlyCharge(a, period);
    return amount > 0 ? [{ assetId: a.id, classId: a.classId, expenseTarget: a.expenseTarget, amount }] : [];
  });

/** The next `months` charges for an asset, as if each were approved in turn. */
export const projectSchedule = (asset: AssetInput, fromPeriod: string, months: number) => {
  const rows: { period: string; charge: number; accumDep: number; nbv: number }[] = [];
  let accumDep = asset.book.accumDep;
  const start = ym(fromPeriod);
  for (let i = 0; i < months; i++) {
    const idx = start.y * 12 + start.m - 1 + i;
    const period = `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}-01`;
    const charge = monthlyCharge({ ...asset, book: { ...asset.book, accumDep } }, period);
    accumDep = fromCents(toCents(accumDep) + toCents(charge));
    rows.push({ period, charge, accumDep, nbv: fromCents(toCents(asset.cost) - toCents(accumDep)) });
    if (charge === 0 && rows.length > 1 && rows[rows.length - 2].charge === 0) break;
  }
  return rows;
};

// ---------------------------------------------------------------------------
// Journals
// ---------------------------------------------------------------------------
export interface ClassAccounts {
  id: string;
  name: string;
  costAccount: string;
  accumAccount: string;
  expenseOverheadAccount: string;
  expenseCogsAccount: string;
}

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
  memo: string;
}

const addTo = (map: Map<string, JournalLine>, account: string, memo: string, debit: number, credit: number) => {
  const key = `${account}\u0000${debit ? "dr" : "cr"}`;
  const line = map.get(key) ?? { account, debit: 0, credit: 0, memo };
  line.debit += debit;
  line.credit += credit;
  map.set(key, line);
};

const finish = (map: Map<string, JournalLine>) =>
  [...map.values()]
    .map((l) => ({ ...l, debit: fromCents(l.debit), credit: fromCents(l.credit) }))
    .sort((a, b) => b.debit - a.debit || a.account.localeCompare(b.account));

/** One summary journal for a run: Dr expense (COS or overhead), Cr accumulated depreciation, per class. */
export const runJournal = (lines: RunLine[], classes: ClassAccounts[], period: string): JournalLine[] => {
  const byId = new Map(classes.map((c) => [c.id, c]));
  const map = new Map<string, JournalLine>();
  const memo = `Depreciation ${periodLabel(period)}`;
  for (const line of lines) {
    const cls = byId.get(line.classId);
    if (!cls) throw new Error(`Unknown asset class ${line.classId}`);
    const cents = toCents(line.amount);
    addTo(map, line.expenseTarget === "cogs" ? cls.expenseCogsAccount : cls.expenseOverheadAccount, memo, cents, 0);
    addTo(map, cls.accumAccount, memo, 0, cents);
  }
  return finish(map);
};

export interface LegacyBalance {
  classId: string;
  legacyAccount: string;
  cost: number;
  accumDep: number;
}

/**
 * The one-off reclass from QBO's per-asset sub-accounts into the class accounts.
 * Each legacy account has "Original cost" and "Depreciation" children in QBO.
 */
export const reclassJournal = (balances: LegacyBalance[], classes: ClassAccounts[]): JournalLine[] => {
  const byId = new Map(classes.map((c) => [c.id, c]));
  const map = new Map<string, JournalLine>();
  const memo = "Reclass per-asset accounts to class accounts";
  for (const b of balances) {
    const cls = byId.get(b.classId);
    if (!cls) throw new Error(`Unknown asset class ${b.classId}`);
    const cost = toCents(b.cost);
    const accum = toCents(b.accumDep);
    if (cost) {
      addTo(map, cls.costAccount, memo, cost, 0);
      addTo(map, `${b.legacyAccount}:Original cost`, memo, 0, cost);
    }
    if (accum) {
      addTo(map, `${b.legacyAccount}:Depreciation`, memo, accum, 0);
      addTo(map, cls.accumAccount, memo, 0, accum);
    }
  }
  return finish(map);
};

/** QBO's journal entry import layout. */
export const journalCsv = (lines: JournalLine[], journalNo: string, date: string) =>
  toCsv([
    ["Journal No", "Journal Date", "Account Name", "Debits", "Credits", "Description"],
    ...lines.map((l) => [journalNo, date, l.account, l.debit ? l.debit.toFixed(2) : "", l.credit ? l.credit.toFixed(2) : "", l.memo]),
  ]);

// ---------------------------------------------------------------------------
// Roll-forward (IAS 16.73(e)) per class for a date range.
// ---------------------------------------------------------------------------
export interface RollForwardAsset {
  id: string;
  classId: string;
  cost: number;
  acquiredOn: string | null;
  inServiceOn: string | null;
  disposedOn: string | null;
  openingAccumDep: number;
  openingAsOf: string | null;
}

export interface ApprovedLine {
  assetId: string;
  period: string;
  amount: number;
}

export interface RollForwardRow {
  classId: string;
  openingCost: number;
  additions: number;
  disposalsCost: number;
  closingCost: number;
  openingAccum: number;
  depreciation: number;
  disposalsAccum: number;
  closingAccum: number;
  openingNbv: number;
  closingNbv: number;
}

/** `from` and `to` are inclusive days (YYYY-MM-DD). */
export const rollForward = (assets: RollForwardAsset[], lines: ApprovedLine[], from: string, to: string): RollForwardRow[] => {
  const linesByAsset = new Map<string, ApprovedLine[]>();
  for (const l of lines) linesByAsset.set(l.assetId, [...(linesByAsset.get(l.assetId) ?? []), l]);

  // Accumulated depreciation at the start of `day`: opening balance if it was
  // already struck, plus runs for months before that day's month.
  const accumBefore = (a: RollForwardAsset, day: string) => {
    let cents = a.openingAsOf && a.openingAsOf < day ? toCents(a.openingAccumDep) : 0;
    for (const l of linesByAsset.get(a.id) ?? []) if (l.period.slice(0, 7) < day.slice(0, 7)) cents += toCents(l.amount);
    return cents;
  };
  const accumThrough = (a: RollForwardAsset, day: string) => {
    let cents = a.openingAsOf && a.openingAsOf <= day ? toCents(a.openingAccumDep) : 0;
    for (const l of linesByAsset.get(a.id) ?? []) if (l.period.slice(0, 7) <= day.slice(0, 7)) cents += toCents(l.amount);
    return cents;
  };

  const rows = new Map<string, Record<keyof Omit<RollForwardRow, "classId">, number>>();
  const row = (classId: string) => {
    if (!rows.has(classId)) {
      rows.set(classId, { openingCost: 0, additions: 0, disposalsCost: 0, closingCost: 0, openingAccum: 0, depreciation: 0, disposalsAccum: 0, closingAccum: 0, openingNbv: 0, closingNbv: 0 });
    }
    return rows.get(classId)!;
  };

  for (const a of assets) {
    const recognised = a.acquiredOn ?? a.inServiceOn;
    if (!recognised || recognised > to) continue;
    if (a.disposedOn && a.disposedOn < from) continue;
    const r = row(a.classId);
    const cost = toCents(a.cost);
    const heldAtStart = recognised < from;
    const disposedInRange = !!a.disposedOn && a.disposedOn <= to;

    if (heldAtStart) {
      r.openingCost += cost;
      r.openingAccum += accumBefore(a, from);
    } else {
      r.additions += cost;
    }
    const accumAtEnd = accumThrough(a, disposedInRange ? a.disposedOn! : to);
    r.depreciation += accumAtEnd - (heldAtStart ? accumBefore(a, from) : 0);
    if (disposedInRange) {
      r.disposalsCost += cost;
      r.disposalsAccum += accumAtEnd;
    }
  }

  return [...rows.entries()].map(([classId, r]) => {
    const closingCost = r.openingCost + r.additions - r.disposalsCost;
    const closingAccum = r.openingAccum + r.depreciation - r.disposalsAccum;
    return {
      classId,
      openingCost: fromCents(r.openingCost),
      additions: fromCents(r.additions),
      disposalsCost: fromCents(r.disposalsCost),
      closingCost: fromCents(closingCost),
      openingAccum: fromCents(r.openingAccum),
      depreciation: fromCents(r.depreciation),
      disposalsAccum: fromCents(r.disposalsAccum),
      closingAccum: fromCents(closingAccum),
      openingNbv: fromCents(r.openingCost - r.openingAccum),
      closingNbv: fromCents(closingCost - closingAccum),
    };
  });
};

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF or LF. */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
};
