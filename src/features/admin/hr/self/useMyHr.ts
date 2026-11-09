import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Employee } from "@/features/admin/hr/useEmployees";
import type { PayrollRun, PayslipRow } from "@/features/admin/hr/payroll/usePayroll";

// Self-service reads rely on the "Employees read own ..." RLS policies: the same
// queries HR runs return only the signed-in employee's rows, and only approved pay.

// HR tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

/** The employee record linked to the signed-in login, or null when HR hasn't linked one. */
export const useMyEmployee = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hr", "me", user?.id],
    enabled: !!user,
    queryFn: async () => unwrap(await db.from("employees").select("*").eq("user_id", user!.id).maybeSingle()) as Employee | null,
  });
};

export interface MyPayslip extends PayslipRow {
  run: PayrollRun;
}

export const useMyPayslips = (employeeId: string | undefined) =>
  useQuery({
    queryKey: ["hr", "me", "payslips", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const rows = unwrap(await db.from("payslips").select("*, run:payroll_runs(*)").eq("employee_id", employeeId)) as MyPayslip[];
      return rows.filter((p) => p.run).sort((a, b) => b.run.period_start.localeCompare(a.run.period_start));
    },
  });

export const useCancelMyLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => unwrap(await db.rpc("cancel_own_leave_request", { _request_id: requestId })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
};

/** HR: link an employee to an existing login by email. Returns the account's email. */
export const linkEmployeeLogin = async (employeeId: string, email: string) =>
  unwrap(await db.rpc("link_employee_login", { _employee_id: employeeId, _email: email })) as string;

export const useEmployeeLoginEmail = (employeeId: string, linked: boolean) =>
  useQuery({
    queryKey: ["hr", "login_email", employeeId, linked],
    enabled: linked,
    queryFn: async () => unwrap(await db.rpc("employee_login_email", { _employee_id: employeeId })) as string | null,
  });
