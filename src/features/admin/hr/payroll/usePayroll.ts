import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Compensation, Employee, PaySplit, RecurringItem } from "@/features/admin/hr/useEmployees";
import { calculatePayslip, type PayItemInput, type Payslip, type PayslipLine } from "./engine";

export type PayrollRunStatus = "draft" | "approved" | "paid";

export interface PayrollRun {
  id: string;
  period_start: string;
  pay_date: string | null;
  status: PayrollRunStatus;
  notes: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Adjustment {
  kind: "earning" | "deduction";
  label: string;
  amount: number;
  taxable: boolean;
}

export interface PayslipRow {
  id: string;
  run_id: string;
  employee_id: string;
  base_pay: number;
  annual_allowances: number;
  gross: number;
  taxable: number;
  nis: number;
  paye: number;
  rr_levy: number;
  other_deductions: number;
  net: number;
  lines: PayslipLine[];
  splits: Payslip["splits"];
  adjustments: Adjustment[];
  warnings: string[];
  rules_source: string | null;
}

// Payroll tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

export const usePayrollRuns = () =>
  useQuery({
    queryKey: ["hr", "payroll_runs"],
    queryFn: async () => unwrap(await db.from("payroll_runs").select("*").order("period_start", { ascending: false })) as PayrollRun[],
  });

export const usePayrollRun = (runId: string | undefined) =>
  useQuery({
    queryKey: ["hr", "payroll_run", runId],
    enabled: !!runId,
    queryFn: async () => {
      const run = unwrap(await db.from("payroll_runs").select("*").eq("id", runId).single()) as PayrollRun;
      const payslips = unwrap(await db.from("payslips").select("*").eq("run_id", runId)) as PayslipRow[];
      return { run, payslips };
    },
  });

const periodEnd = (periodStart: string) => {
  const d = new Date(`${periodStart}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
};

const inPeriod = (from: string | null, to: string | null, start: string, end: string) =>
  (!from || from <= end) && (!to || to >= start);

interface PayrollData {
  employees: Employee[];
  compensation: Compensation[];
  items: RecurringItem[];
  splits: PaySplit[];
}

const loadPayrollData = async (): Promise<PayrollData> => {
  const [employees, compensation, items, splits] = await Promise.all([
    db.from("employees").select("*").neq("status", "terminated"),
    db.from("employee_compensation").select("*"),
    db.from("employee_recurring_items").select("*").eq("active", true),
    db.from("employee_pay_splits").select("*").eq("active", true).order("sort_order"),
  ]);
  return { employees: unwrap(employees), compensation: unwrap(compensation), items: unwrap(items), splits: unwrap(splits) };
};

/** Works out one employee's payslip for the period, or why it can't be. */
const buildPayslip = (data: PayrollData, employee: Employee, periodStart: string, adjustments: Adjustment[]) => {
  const end = periodEnd(periodStart);
  const comp = data.compensation
    .filter((c) => c.employee_id === employee.id && inPeriod(c.effective_from, c.effective_to, periodStart, end))
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  if (!comp) return { skip: "no pay set up for this month" };
  if (comp.pay_type !== "salary" || comp.pay_frequency !== "monthly") return { skip: "only monthly salaries are supported so far" };

  const items: PayItemInput[] = [
    ...data.items
      .filter((i) => i.employee_id === employee.id && inPeriod(i.start_date, i.end_date, periodStart, end))
      .map((i) => ({
        recurringItemId: i.id,
        kind: i.kind,
        label: i.label,
        amount: i.amount,
        percent: i.percent,
        taxable: i.taxable,
        loanBalance: i.loan_balance,
      })),
    ...adjustments,
  ];
  const annualAllowances = comp.annual_personal_allowance + comp.annual_child_allowance + comp.annual_other_allowance;
  const slip = calculatePayslip({
    periodStart,
    basePay: comp.base_amount,
    annualAllowances,
    rrLevyExempt: employee.rr_levy_exempt,
    items,
    splits: data.splits
      .filter((s) => s.employee_id === employee.id)
      .map((s) => ({ label: s.label, method: s.method, amount: s.amount, isRemainder: s.is_remainder })),
  });
  return {
    row: {
      employee_id: employee.id,
      base_pay: comp.base_amount,
      annual_allowances: annualAllowances,
      gross: slip.gross,
      taxable: slip.taxable,
      nis: slip.nis,
      paye: slip.paye,
      rr_levy: slip.rrLevy,
      other_deductions: slip.otherDeductions,
      net: slip.net,
      lines: slip.lines,
      splits: slip.splits,
      adjustments,
      warnings: slip.warnings,
      rules_source: slip.rulesSource,
    },
  };
};

export interface Skipped {
  employeeId: string;
  reason: string;
}

/** Recalculates every payslip in a draft run from current employee pay data, keeping one-off adjustments. */
const calculateRun = async (runId: string, periodStart: string, adjustmentsByEmployee: Map<string, Adjustment[]>) => {
  const data = await loadPayrollData();
  const rows = [];
  const skipped: Skipped[] = [];
  for (const employee of data.employees) {
    const result = buildPayslip(data, employee, periodStart, adjustmentsByEmployee.get(employee.id) ?? []);
    if (result.row) rows.push({ ...result.row, run_id: runId });
    else skipped.push({ employeeId: employee.id, reason: result.skip });
  }
  unwrap(await db.from("payslips").delete().eq("run_id", runId));
  if (rows.length) unwrap(await db.from("payslips").insert(rows));
  return skipped;
};

export const useCreatePayrollRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodStart, payDate }: { periodStart: string; payDate: string | null }) => {
      const run = unwrap(await db.from("payroll_runs").insert({ period_start: periodStart, pay_date: payDate }).select().single()) as PayrollRun;
      const skipped = await calculateRun(run.id, periodStart, new Map());
      return { run, skipped };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
};

export const useRecalculatePayrollRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ run, payslips, adjustments }: { run: PayrollRun; payslips: PayslipRow[]; adjustments?: { employeeId: string; items: Adjustment[] } }) => {
      const byEmployee = new Map(payslips.map((p) => [p.employee_id, p.adjustments ?? []]));
      if (adjustments) byEmployee.set(adjustments.employeeId, adjustments.items);
      return calculateRun(run.id, run.period_start, byEmployee);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
};

export const usePayrollRunAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId, action }: { runId: string; action: "approve" | "paid" | "delete" }) => {
      if (action === "approve") return unwrap(await db.rpc("approve_payroll_run", { _run_id: runId }));
      if (action === "paid") return unwrap(await db.from("payroll_runs").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", runId));
      return unwrap(await db.from("payroll_runs").delete().eq("id", runId));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
};

export const RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = { draft: "Draft", approved: "Approved", paid: "Paid" };

export const periodLabel = (periodStart: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${periodStart}T00:00:00Z`));

/** NIS, PAYE and the levy are due to the authorities by the 15th of the following month. */
export const remittanceDue = (periodStart: string) => {
  const d = new Date(`${periodStart}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 15);
  return d.toISOString().slice(0, 10);
};
