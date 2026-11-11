import type { Compensation } from "./useEmployees";

type Span = Pick<Compensation, "id" | "effective_from" | "effective_to">;

export interface PayChangePlan {
  /** Last day the new pay covers; null = open-ended. */
  to: string | null;
  /** True when the change touches pay that has already started, rather than just following the latest record. */
  isCorrection: boolean;
  /** Records that now end earlier, or start later, because the new pay takes over part of their dates. */
  trim: { id: string; values: { effective_from?: string; effective_to?: string } }[];
  /** Records the new pay fully replaces. */
  remove: Compensation[];
  /** Records the new pay lands in the middle of: the part after it is kept as a copy. */
  tail: { source: Compensation; effective_from: string; effective_to: string | null }[];
}

const shiftDay = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Works out how a new pay record fits into an employee's pay history. The new pay runs from `from`
 * to `to`; with no `to` it runs until the next pay record begins, or open-ended if none does.
 * Pay already on record is trimmed, split or replaced so no two records cover the same day.
 */
export const planPayChange = (rows: Compensation[], from: string, to?: string | null): PayChangePlan | { error: string } => {
  if (!from) return { error: "Choose the date the new pay starts." };
  if (to && to < from) return { error: "The end date cannot be before the start date." };

  const nextStart = rows.map((r) => r.effective_from).filter((d) => d > from).sort()[0];
  const end = to || (nextStart ? shiftDay(nextStart, -1) : null);
  const plan: PayChangePlan = { to: end, isCorrection: false, trim: [], remove: [], tail: [] };

  for (const row of rows) {
    const overlaps = (end === null || row.effective_from <= end) && (row.effective_to === null || row.effective_to >= from);
    if (!overlaps) continue;

    const runsPastEnd = end !== null && (row.effective_to === null || row.effective_to > end);
    if (row.effective_from < from) {
      plan.trim.push({ id: row.id, values: { effective_to: shiftDay(from, -1) } });
      if (runsPastEnd) plan.tail.push({ source: row, effective_from: shiftDay(end!, 1), effective_to: row.effective_to });
    } else if (runsPastEnd) {
      plan.trim.push({ id: row.id, values: { effective_from: shiftDay(end!, 1) } });
    } else {
      plan.remove.push(row);
    }
  }

  // Following the latest record is an ordinary raise; anything else rewrites pay that has already started.
  const latestStart = rows.map((r) => r.effective_from).sort().pop();
  plan.isCorrection = latestStart !== undefined && from <= latestStart;
  return plan;
};

export const isPlanError = (plan: PayChangePlan | { error: string }): plan is { error: string } => "error" in plan;

/** One line for the reason column, so what a correction replaced is not lost. */
export const describeReplaced = (row: Span & Pick<Compensation, "base_amount" | "pay_frequency" | "currency">) =>
  `${row.currency} ${Number(row.base_amount).toFixed(2)}/${row.pay_frequency.replace("_", "-")} from ${row.effective_from}${row.effective_to ? ` to ${row.effective_to}` : ""}`;
