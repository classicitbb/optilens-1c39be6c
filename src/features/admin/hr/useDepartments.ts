import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ManagerRelationship = "line" | "dotted" | "functional";

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  parent_department_id: string | null;
  head_employee_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeManager {
  id: string;
  employee_id: string;
  manager_id: string;
  relationship: ManagerRelationship;
  is_primary: boolean;
  employee_position_id: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const RELATIONSHIP_LABELS: Record<ManagerRelationship, string> = {
  line: "Line manager",
  dotted: "Dotted-line manager",
  functional: "Functional manager",
};

// HR tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

export const useDepartments = () =>
  useQuery({
    queryKey: ["hr", "departments"],
    retry: 1,
    queryFn: async () => unwrap(await db.from("departments").select("*").order("name")) as Department[],
  });

export const useEmployeeManagers = () =>
  useQuery({
    queryKey: ["hr", "employee_managers"],
    retry: 1,
    queryFn: async () => unwrap(await db.from("employee_managers").select("*")) as EmployeeManager[],
  });

/** A manager link counts until its end date passes. */
export const isCurrentManager = (m: Pick<EmployeeManager, "end_date">, today = new Date().toISOString().slice(0, 10)) =>
  !m.end_date || m.end_date >= today;

/** Select options for a department picker; inactive departments are left out unless already chosen. */
export const departmentOptions = (departments: Department[], keepId?: string | null): Record<string, string> => ({
  "": "— None —",
  ...Object.fromEntries(departments.filter((d) => d.active || d.id === keepId).map((d) => [d.id, d.name])),
});
