// Leave balances and payroll effect, as pure functions over plain rows so they can
// be unit-tested. Dates are ISO YYYY-MM-DD strings and compared as strings.

export type LeaveBasis = "per_year" | "per_event" | "none";
export type PayrollEffect = "paid" | "unpaid" | "nis_benefit";

export interface EntitlementTier {
  /** Completed years of service at the anniversary. */
  min_years: number;
  days: number;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  basis: LeaveBasis;
  entitlement_tiers: EntitlementTier[];
  carry_over_max_days: number | null;
  payroll_effect: PayrollEffect;
  certificate_after_days: number | null;
  legal_basis: string | null;
  notes: string | null;
  active: boolean;
  sort_order: number;
}

export interface LeavePolicy {
  tracking_from: string;
  /** ISO weekdays, 1 = Monday. */
  work_days: number[];
}

export type LeaveStatus = "requested" | "approved" | "declined" | "cancelled";

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: LeaveStatus;
  reason: string | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface LeaveAdjustment {
  id: string;
  employee_id: string;
  leave_type_id: string;
  days: number;
  effective_date: string;
  reason: string;
  created_at: string;
}

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const isoWeekday = (d: Date) => d.getUTCDay() || 7;

/** Working days from start to end inclusive. Public holidays are not known here; edit the request's days for those. */
export const workingDaysBetween = (start: string, end: string, workDays: number[]) => {
  let count = 0;
  for (let d = utc(start); iso(d) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (workDays.includes(isoWeekday(d))) count++;
  }
  return count;
};

/** The highest tier the completed years reach, or 0 days. */
export const tierDays = (tiers: EntitlementTier[], years: number) =>
  [...tiers].sort((a, b) => b.min_years - a.min_years).find((t) => years >= t.min_years)?.days ?? 0;

/** Days earned on each employment anniversary from tracking start up to asOf. */
export const anniversaryGrants = (tiers: EntitlementTier[], hireDate: string, trackingFrom: string, asOf: string) => {
  const grants: { date: string; days: number; years: number }[] = [];
  const hire = utc(hireDate);
  for (let years = 1; ; years++) {
    const d = new Date(hire);
    d.setUTCFullYear(hire.getUTCFullYear() + years);
    const date = iso(d);
    if (date > asOf) break;
    if (date >= trackingFrom) grants.push({ date, days: tierDays(tiers, years), years });
  }
  return grants;
};

export interface LeaveBalance {
  type: LeaveType;
  /** Days available now (per_year only). */
  available: number | null;
  /** Approved days taken since tracking started (per_event and none: in the current year). */
  taken: number;
  /** Requested but not yet decided. */
  pending: number;
  /** The anniversary when the next grant lands, and its size. */
  next: { date: string; days: number } | null;
}

/**
 * Walks grants, adjustments and approved leave in date order. Before each
 * anniversary grant the running balance is cut to the carry-over cap, if any.
 */
export const leaveBalance = (
  type: LeaveType,
  employee: { id: string; hire_date: string | null },
  policy: LeavePolicy,
  requests: LeaveRequest[],
  adjustments: LeaveAdjustment[],
  asOf: string,
): LeaveBalance => {
  const mine = requests.filter((r) => r.employee_id === employee.id && r.leave_type_id === type.id);
  const pending = mine.filter((r) => r.status === "requested").reduce((s, r) => s + Number(r.days), 0);
  const approved = mine.filter((r) => r.status === "approved");

  if (type.basis !== "per_year") {
    const yearStart = `${asOf.slice(0, 4)}-01-01`;
    const taken = approved.filter((r) => r.start_date >= yearStart && r.start_date <= asOf).reduce((s, r) => s + Number(r.days), 0);
    return { type, available: null, taken, pending, next: null };
  }

  const from = policy.tracking_from;
  const events: { date: string; order: number; apply: (b: number) => number }[] = [];
  if (employee.hire_date) {
    for (const g of anniversaryGrants(type.entitlement_tiers, employee.hire_date, from, asOf)) {
      const cap = type.carry_over_max_days;
      events.push({ date: g.date, order: 0, apply: (b) => (cap == null ? b : Math.min(b, cap)) + g.days });
    }
  }
  for (const a of adjustments.filter((x) => x.employee_id === employee.id && x.leave_type_id === type.id && x.effective_date <= asOf)) {
    events.push({ date: a.effective_date, order: 1, apply: (b) => b + Number(a.days) });
  }
  const tracked = approved.filter((r) => r.start_date >= from && r.start_date <= asOf);
  for (const r of tracked) events.push({ date: r.start_date, order: 2, apply: (b) => b - Number(r.days) });

  events.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
  const available = events.reduce((b, e) => e.apply(b), 0);
  const taken = tracked.reduce((s, r) => s + Number(r.days), 0);

  let next: LeaveBalance["next"] = null;
  if (employee.hire_date) {
    const upcoming = anniversaryGrants(type.entitlement_tiers, employee.hire_date, asOf, nextYear(asOf)).find((g) => g.date > asOf);
    if (upcoming) next = { date: upcoming.date, days: upcoming.days };
  }
  return { type, available: round2(available), taken, pending, next };
};

const nextYear = (asOf: string) => {
  const d = utc(asOf);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return iso(d);
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Approved leave the employer does not pay for, falling inside a pay period. A
 * request spanning periods is split by its working days, scaled to the days
 * recorded on it (which HR may have trimmed for a public holiday).
 */
export const unpaidLeaveInPeriod = (
  employeeId: string,
  requests: LeaveRequest[],
  types: LeaveType[],
  policy: LeavePolicy,
  periodStart: string,
  periodEnd: string,
) => {
  const byId = new Map(types.map((t) => [t.id, t]));
  const out: { type: LeaveType; days: number }[] = [];
  for (const r of requests) {
    const type = byId.get(r.leave_type_id);
    if (r.employee_id !== employeeId || r.status !== "approved" || !type || type.payroll_effect === "paid") continue;
    if (r.end_date < periodStart || r.start_date > periodEnd) continue;
    const total = workingDaysBetween(r.start_date, r.end_date, policy.work_days);
    const overlap = workingDaysBetween(r.start_date > periodStart ? r.start_date : periodStart, r.end_date < periodEnd ? r.end_date : periodEnd, policy.work_days);
    const days = total ? round2((Number(r.days) * overlap) / total) : 0;
    if (days > 0) {
      const existing = out.find((o) => o.type.id === type.id);
      if (existing) existing.days = round2(existing.days + days);
      else out.push({ type, days });
    }
  }
  return out;
};
