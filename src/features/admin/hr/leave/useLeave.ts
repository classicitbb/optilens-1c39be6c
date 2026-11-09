import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeaveAdjustment, LeavePolicy, LeaveRequest, LeaveType } from "./leaveBalance";

// Leave tables are newer than the generated Supabase types.
const db = supabase as any;

const unwrap = <T,>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error;
  return data;
};

export const fetchLeaveTypes = async () =>
  unwrap(await db.from("leave_types").select("*").order("sort_order").order("name")) as LeaveType[];

export const fetchLeavePolicy = async () =>
  unwrap(await db.from("leave_policy").select("tracking_from, work_days").single()) as LeavePolicy;

export const fetchLeaveRequests = async (employeeId?: string) => {
  let query = db.from("leave_requests").select("*").order("start_date", { ascending: false });
  if (employeeId) query = query.eq("employee_id", employeeId);
  return unwrap(await query) as LeaveRequest[];
};

export const useLeaveTypes = () => useQuery({ queryKey: ["hr", "leave_types"], queryFn: fetchLeaveTypes });
export const useLeavePolicy = () => useQuery({ queryKey: ["hr", "leave_policy"], queryFn: fetchLeavePolicy });

export const useLeaveRequests = (employeeId?: string) =>
  useQuery({ queryKey: ["hr", "leave_requests", employeeId ?? "all"], queryFn: () => fetchLeaveRequests(employeeId) });

export const useLeaveAdjustments = (employeeId?: string) =>
  useQuery({
    queryKey: ["hr", "leave_adjustments", employeeId ?? "all"],
    queryFn: async () => {
      let query = db.from("leave_adjustments").select("*").order("effective_date", { ascending: false });
      if (employeeId) query = query.eq("employee_id", employeeId);
      return unwrap(await query) as LeaveAdjustment[];
    },
  });

export const PAYROLL_EFFECT_LABELS = { paid: "Paid by employer", unpaid: "Unpaid (deducted)", nis_benefit: "Unpaid; NIS benefit" } as const;
export const BASIS_LABELS = { per_year: "Earned each year of service", per_event: "Per occurrence", none: "No fixed entitlement" } as const;
export const LEAVE_STATUS_LABELS = { requested: "Requested", approved: "Approved", declined: "Declined", cancelled: "Cancelled" } as const;

export const today = () => new Date().toISOString().slice(0, 10);
