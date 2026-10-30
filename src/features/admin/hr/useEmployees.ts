import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EmployeeStatus = "active" | "on_leave" | "terminated";
export type EmploymentType = "full_time" | "part_time" | "contract" | "casual";

export interface Employee {
  id: string;
  user_id: string | null;
  employee_no: string | null;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  department: string | null;
  manager_id: string | null;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  hire_date: string | null;
  termination_date: string | null;
  termination_reason: string | null;
  tax_code: string | null;
  rr_levy_exempt: boolean;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Compensation {
  id: string;
  employee_id: string;
  pay_type: "salary" | "hourly";
  pay_frequency: "monthly" | "semi_monthly" | "fortnightly" | "weekly";
  base_amount: number;
  currency: string;
  annual_personal_allowance: number;
  annual_child_allowance: number;
  annual_other_allowance: number;
  effective_from: string;
  effective_to: string | null;
  reason: string | null;
}

export interface RecurringItem {
  id: string;
  employee_id: string;
  kind: "earning" | "deduction";
  label: string;
  amount: number | null;
  percent: number | null;
  taxable: boolean;
  loan_principal: number | null;
  loan_balance: number | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  notes: string | null;
}

export interface PaySplit {
  id: string;
  employee_id: string;
  label: string;
  method: "bank_transfer" | "cheque" | "cash" | "third_party";
  amount: number | null;
  is_remainder: boolean;
  sort_order: number;
  active: boolean;
}

export interface EmployeeNote {
  id: string;
  employee_id: string;
  category: "general" | "check_in" | "commendation" | "disciplinary";
  body: string;
  visibility: "hr_only" | "shared";
  created_at: string;
  updated_at: string | null;
}

export interface EmployeeSensitive {
  employee_id: string;
  national_registration_no: string | null;
  nis_no: string | null;
  tax_file_no: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_no: string | null;
}

// HR tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

export const employeeDisplayName = (e: Pick<Employee, "first_name" | "last_name" | "preferred_name">) =>
  `${e.preferred_name || e.first_name} ${e.last_name}`;

export const useEmployees = () =>
  useQuery({
    queryKey: ["hr", "employees"],
    retry: 1,
    queryFn: async () =>
      unwrap(await db.from("employees").select("*").order("last_name").order("first_name")) as Employee[],
  });

export const useEmployee = (id: string | undefined) =>
  useQuery({
    queryKey: ["hr", "employee", id],
    enabled: !!id,
    queryFn: async () => unwrap(await db.from("employees").select("*").eq("id", id).single()) as Employee,
  });

/** Child rows of an employee, newest first where that matters. */
export const useEmployeeRows = <T,>(table: string, employeeId: string | undefined, order = "created_at") =>
  useQuery({
    queryKey: ["hr", table, employeeId],
    enabled: !!employeeId,
    queryFn: async () =>
      unwrap(await db.from(table).select("*").eq("employee_id", employeeId).order(order, { ascending: false })) as T[],
  });

/** Insert, update or delete a row in an HR table and refresh the employee's queries. */
export const useHrMutation = (table: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (op: { insert?: Record<string, unknown>; update?: { id: string; values: Record<string, unknown> }; deleteId?: string }) => {
      if (op.insert) return unwrap(await db.from(table).insert(op.insert).select().single());
      if (op.update) return unwrap(await db.from(table).update(op.update.values).eq("id", op.update.id).select().single());
      if (op.deleteId) return unwrap(await db.from(table).delete().eq("id", op.deleteId));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr"] }),
  });
};

/** Creates a CRM contact from the employee's details and links it. */
export const createContactForEmployee = async (e: Employee) => {
  const contact = unwrap(
    await db
      .from("contacts")
      .insert({ name: `${e.first_name} ${e.last_name}`, email: e.email, phone: e.phone, street: e.address ?? "", is_company: false, type: "individual", status: "active", lead_source: "employee" })
      .select("id")
      .single(),
  ) as { id: string };
  unwrap(await db.from("employees").update({ contact_id: contact.id }).eq("id", e.id));
  return contact.id;
};

/** Reading sensitive fields is logged server-side, so it only happens on an explicit click. */
export const revealEmployeeSensitive = async (employeeId: string) =>
  unwrap(await db.rpc("reveal_employee_sensitive", { _employee_id: employeeId })) as EmployeeSensitive | null;

export const saveEmployeeSensitive = async (v: EmployeeSensitive) =>
  unwrap(
    await db.rpc("save_employee_sensitive", {
      _employee_id: v.employee_id,
      _national_registration_no: v.national_registration_no,
      _nis_no: v.nis_no,
      _tax_file_no: v.tax_file_no,
      _bank_name: v.bank_name,
      _bank_branch: v.bank_branch,
      _bank_account_no: v.bank_account_no,
    }),
  );
