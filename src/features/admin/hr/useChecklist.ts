import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChecklistContext, Dismissal } from "./checklist";
import { isCurrentManager, useEmployeeManagers } from "./useDepartments";

// HR tables are newer than the generated Supabase types.
const db = supabase as any;

/** Items operators have put aside. If the table is not there yet the list simply has nothing set aside. */
export const useChecklistDismissals = () =>
  useQuery({
    queryKey: ["hr", "checklist_dismissals"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await db.from("employee_checklist_dismissals").select("id, employee_id, item_key, dismissed_until");
      if (error) return [] as Dismissal[];
      return data as Dismissal[];
    },
  });

interface PayStub { employee_id: string; pay_day: number | null; effective_to: string | null }

/** Only whether pay exists and has a pay day: no amounts are loaded for the checklist. */
const usePayStubs = () =>
  useQuery({
    queryKey: ["hr", "checklist_pay_stubs"],
    queryFn: async () => {
      const { data, error } = await db.from("employee_compensation").select("employee_id, pay_day, effective_to").is("effective_to", null);
      if (error) throw error;
      return data as PayStub[];
    },
  });

/** What the checklist needs to know about each employee beyond their own record. */
export const useChecklistContext = () => {
  const { data: stubs = [] } = usePayStubs();
  const { data: links = [] } = useEmployeeManagers();
  return useMemo(() => {
    const pay = new Map(stubs.map((s) => [s.employee_id, s]));
    const managed = new Set(links.filter((l) => isCurrentManager(l)).map((l) => l.employee_id));
    return (employeeId: string): ChecklistContext => ({
      hasCurrentPay: pay.has(employeeId),
      hasPayDay: pay.get(employeeId)?.pay_day != null,
      hasManager: managed.has(employeeId),
    });
  }, [stubs, links]);
};
