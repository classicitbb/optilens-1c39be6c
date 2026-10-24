import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmDashboardPeriod } from "./useCrmDashboardKpis";

export interface CrmCallKpiRow {
  owner_id: string | null;
  calls: number;
  reached: number;
  calls_per_day: number;
  working_days: number;
}

export const useCrmCallKpis = ({ period, startDate, endDate }: { period: CrmDashboardPeriod; startDate?: string; endDate?: string }) =>
  useQuery({
    queryKey: ["crm-dashboard", "call-kpis", period, startDate, endDate],
    queryFn: async (): Promise<CrmCallKpiRow[]> => {
      const { data, error } = await (supabase as any).rpc("crm_call_kpis", {
        p_period: period,
        p_start_date: period === "custom" ? startDate ?? null : null,
        p_end_date: period === "custom" ? endDate ?? null : null,
      });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        owner_id: row.owner_id,
        calls: Number(row.calls ?? 0),
        reached: Number(row.reached ?? 0),
        calls_per_day: Number(row.calls_per_day ?? 0),
        working_days: Number(row.working_days ?? 0),
      }));
    },
  });
