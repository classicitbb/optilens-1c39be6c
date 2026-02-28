import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardKpis {
  totalOpportunities: number;
  activeOpportunities: number;
  wonThisMonth: number;
  pipelineValue: number;
}

export const useDashboardKpis = () => {
  return useQuery({
    queryKey: ["admin-dashboard", "kpis"],
    queryFn: async (): Promise<DashboardKpis> => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [totalResult, activeResult, wonThisMonthResult, pipelineValueResult] = await Promise.all([
        supabase.from("opportunities").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).not("stage", "in", "(won,lost)"),
        supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .eq("stage", "won")
          .gte("updated_at", monthStart.toISOString()),
        supabase.from("opportunities").select("estimated_value").not("stage", "in", "(won,lost)"),
      ]);

      if (totalResult.error) throw totalResult.error;
      if (activeResult.error) throw activeResult.error;
      if (wonThisMonthResult.error) throw wonThisMonthResult.error;
      if (pipelineValueResult.error) throw pipelineValueResult.error;

      const pipelineValue = (pipelineValueResult.data ?? []).reduce(
        (total, row) => total + Number(row.estimated_value ?? 0),
        0,
      );

      return {
        totalOpportunities: totalResult.count ?? 0,
        activeOpportunities: activeResult.count ?? 0,
        wonThisMonth: wonThisMonthResult.count ?? 0,
        pipelineValue,
      };
    },
  });
};
