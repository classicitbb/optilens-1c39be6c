import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Compensation, Employee } from "@/features/admin/hr/useEmployees";
import { calculatePayslip } from "@/features/admin/hr/payroll/engine";
import { ageAtYearEnd, annualTax, EMPTY_CLAIMS, type TaxClaims } from "./annualTax";

// Tax tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

export interface TaxYearRow {
  id: string;
  employee_id: string;
  year: number;
  opening_months: number;
  opening_income: number;
  opening_paye: number;
  claims: Partial<TaxClaims>;
  notes: string | null;
}

export interface YearPayslip {
  employee_id: string;
  taxable: number;
  paye: number;
  period_start: string;
  status: "draft" | "approved" | "paid";
}

export interface TaxYearData {
  taxYears: TaxYearRow[];
  payslips: YearPayslip[];
  compensation: Compensation[];
}

/** Everything the estimates need for one tax year, for all employees. */
export const useTaxYearData = (year: number) =>
  useQuery({
    queryKey: ["hr", "tax_year", year],
    queryFn: async (): Promise<TaxYearData> => {
      const [taxYears, runs, compensation] = await Promise.all([
        db.from("employee_tax_years").select("*").eq("year", year),
        db.from("payroll_runs").select("id, period_start, status").gte("period_start", `${year}-01-01`).lte("period_start", `${year}-12-01`),
        db.from("employee_compensation").select("*"),
      ]);
      const runRows = unwrap(runs) as { id: string; period_start: string; status: YearPayslip["status"] }[];
      const runById = new Map(runRows.map((r) => [r.id, r]));
      const slips = runRows.length
        ? (unwrap(await db.from("payslips").select("run_id, employee_id, taxable, paye").in("run_id", runRows.map((r) => r.id))) as {
            run_id: string;
            employee_id: string;
            taxable: number;
            paye: number;
          }[])
        : [];
      return {
        taxYears: unwrap(taxYears),
        compensation: unwrap(compensation),
        payslips: slips.map((s) => ({
          employee_id: s.employee_id,
          taxable: Number(s.taxable),
          paye: Number(s.paye),
          period_start: runById.get(s.run_id)!.period_start,
          status: runById.get(s.run_id)!.status,
        })),
      };
    },
  });

export const claimsOf = (row: TaxYearRow | undefined): TaxClaims => ({ ...EMPTY_CLAIMS, ...(row?.claims ?? {}) });

/**
 * The year's estimate: income and PAYE from before the app (opening figures),
 * every payslip in the year (drafts included, flagged), and the remaining months
 * projected from the latest payslip, or from current pay if there is none.
 */
export const estimateYear = (employee: Employee, year: number, data: TaxYearData) => {
  const row = data.taxYears.find((t) => t.employee_id === employee.id);
  const slips = data.payslips.filter((p) => p.employee_id === employee.id).sort((a, b) => a.period_start.localeCompare(b.period_start));
  const openingMonths = row?.opening_months ?? 0;
  const remaining = Math.max(12 - openingMonths - slips.length, 0);

  const latest = slips[slips.length - 1];
  let monthly = latest ? { taxable: latest.taxable, paye: latest.paye } : null;
  if (!monthly && remaining > 0) {
    const comp = data.compensation
      .filter((c) => c.employee_id === employee.id && !c.effective_to && c.pay_type === "salary" && c.pay_frequency === "monthly")
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    if (comp) {
      const allowances = comp.annual_personal_allowance + comp.annual_child_allowance + comp.annual_other_allowance;
      const slip = calculatePayslip({ periodStart: `${year}-12-01`, basePay: comp.base_amount, annualAllowances: allowances, rrLevyExempt: employee.rr_levy_exempt });
      monthly = { taxable: slip.taxable, paye: slip.paye };
    }
  }

  const income = Number(row?.opening_income ?? 0) + slips.reduce((s, p) => s + p.taxable, 0) + remaining * (monthly?.taxable ?? 0);
  const paye = Number(row?.opening_paye ?? 0) + slips.reduce((s, p) => s + p.paye, 0) + remaining * (monthly?.paye ?? 0);
  const result = annualTax({ year, employmentIncome: income, payeWithheld: paye, age: ageAtYearEnd(employee.date_of_birth, year), claims: claimsOf(row) });

  return {
    row,
    result,
    months: { opening: openingMonths, payslips: slips.length, drafts: slips.filter((s) => s.status === "draft").length, projected: monthly ? remaining : 0 },
    /** Months with no figures at all: no opening months, no payslip and nothing to project from. */
    missingMonths: monthly ? 0 : remaining,
  };
};
