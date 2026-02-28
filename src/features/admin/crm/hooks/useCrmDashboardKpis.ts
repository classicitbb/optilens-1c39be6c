import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CrmDashboardPeriod = "mtd" | "qtd" | "custom";

export interface CrmDashboardKpis {
  period_start: string;
  period_end: string;
  contacts_count: number;
  price_items_count: number;
  avg_markup: number;
  open_opportunities: number;
  overdue_activities: number;
  quote_acceptance_rate: number;
  landed_costing_total: number;
}

interface UseCrmDashboardKpisParams {
  period: CrmDashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export const useCrmDashboardKpis = ({ period, startDate, endDate }: UseCrmDashboardKpisParams) => {
  return useQuery({
    queryKey: ["crm-dashboard", "kpis", period, startDate, endDate],
    queryFn: async (): Promise<CrmDashboardKpis> => {
      const { data, error } = await (supabase as any).rpc("crm_dashboard_kpis", {
        p_period: period,
        p_start_date: period === "custom" ? startDate ?? null : null,
        p_end_date: period === "custom" ? endDate ?? null : null,
      });

      if (error) throw error;

      const row = data?.[0];
      if (!row) {
        return {
          period_start: startDate ?? new Date().toISOString().slice(0, 10),
          period_end: endDate ?? new Date().toISOString().slice(0, 10),
          contacts_count: 0,
          price_items_count: 0,
          avg_markup: 0,
          open_opportunities: 0,
          overdue_activities: 0,
          quote_acceptance_rate: 0,
          landed_costing_total: 0,
        };
      }

      return {
        period_start: row.period_start,
        period_end: row.period_end,
        contacts_count: Number(row.contacts_count ?? 0),
        price_items_count: Number(row.price_items_count ?? 0),
        avg_markup: Number(row.avg_markup ?? 0),
        open_opportunities: Number(row.open_opportunities ?? 0),
        overdue_activities: Number(row.overdue_activities ?? 0),
        quote_acceptance_rate: Number(row.quote_acceptance_rate ?? 0),
        landed_costing_total: Number(row.landed_costing_total ?? 0),
      };
    },
  });
};
