import type { Employee } from "./useEmployees";

export type ChecklistTab = "profile" | "pay" | "positions";

export interface ChecklistContext {
  hasCurrentPay: boolean;
  hasPayDay: boolean;
  hasManager: boolean;
}

interface ChecklistDef {
  key: string;
  label: string;
  tab: ChecklistTab;
  /** The form field to land on. */
  field: string;
  /** A pop-up form to open first. */
  opens?: string;
  /** Only asked of people still on the books; the rest apply to everyone listed. */
  when?: "current" | "terminated";
  missing: (e: Employee, ctx: ChecklistContext) => boolean;
}

const blank = (v: string | null | undefined) => !v || !v.trim();

export const CHECKLIST: ChecklistDef[] = [
  { key: "date_of_birth", label: "Date of birth", tab: "profile", field: "date_of_birth", missing: (e) => blank(e.date_of_birth) },
  { key: "email", label: "Email", tab: "profile", field: "email", missing: (e) => blank(e.email) },
  { key: "phone", label: "Phone", tab: "profile", field: "phone", missing: (e) => blank(e.phone) },
  { key: "address", label: "Address", tab: "profile", field: "address", missing: (e) => blank(e.address) },
  { key: "employee_no", label: "Employee number", tab: "profile", field: "employee_no", missing: (e) => blank(e.employee_no) },
  { key: "hire_date", label: "Hire date", tab: "profile", field: "hire_date", missing: (e) => blank(e.hire_date) },
  { key: "job_title", label: "Job title", tab: "profile", field: "job_title", missing: (e) => blank(e.job_title) },
  { key: "department", label: "Department", tab: "profile", field: "department_id", missing: (e) => blank(e.department) && !e.department_id },
  { key: "manager", label: "Line manager", tab: "positions", field: "manager_id", opens: "add-manager", missing: (_e, c) => !c.hasManager },
  { key: "pay", label: "Pay set up", tab: "pay", field: "base_amount", opens: "change-pay", missing: (_e, c) => !c.hasCurrentPay },
  { key: "pay_day", label: "Pay day", tab: "pay", field: "pay_day", opens: "change-pay", missing: (_e, c) => c.hasCurrentPay && !c.hasPayDay },
  { key: "termination_date", label: "Termination date", tab: "profile", field: "termination_date", when: "terminated", missing: (e) => blank(e.termination_date) },
];

export interface Dismissal {
  id: string;
  employee_id: string;
  item_key: string;
  /** null = does not apply, for good; otherwise hidden until the end of that day. */
  dismissed_until: string | null;
}

export interface OutstandingItem { key: string; label: string; tab: ChecklistTab; field: string; opens?: string }

export interface ChecklistState {
  /** Still blank and not set aside. */
  open: OutstandingItem[];
  /** Blank, hidden for now. */
  later: (OutstandingItem & { dismissal: Dismissal })[];
  /** Blank, marked as not applying. */
  ignored: (OutstandingItem & { dismissal: Dismissal })[];
}

export const checklistFor = (employee: Employee, ctx: ChecklistContext, dismissals: Dismissal[], today: string): ChecklistState => {
  const state: ChecklistState = { open: [], later: [], ignored: [] };
  const terminated = employee.status === "terminated";
  for (const def of CHECKLIST) {
    if (def.when === "terminated" ? !terminated : terminated) continue;
    if (!def.missing(employee, ctx)) continue;
    const item = { key: def.key, label: def.label, tab: def.tab, field: def.field, opens: def.opens };
    const dismissal = dismissals.find((d) => d.employee_id === employee.id && d.item_key === def.key);
    if (!dismissal) state.open.push(item);
    else if (dismissal.dismissed_until === null) state.ignored.push({ ...item, dismissal });
    else if (dismissal.dismissed_until >= today) state.later.push({ ...item, dismissal });
    else state.open.push(item);
  }
  return state;
};
