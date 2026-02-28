import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardTrendPoint {
  month: string;
  opportunities: number;
  activities: number;
}

export const useDashboardTrends = () => {
  return useQuery({
    queryKey: ["admin-dashboard", "trends"],
    queryFn: async (): Promise<DashboardTrendPoint[]> => {
      const startDate = subMonths(new Date(), 5);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const [opportunitiesResult, activitiesResult] = await Promise.all([
        supabase.from("opportunities").select("created_at").gte("created_at", startDate.toISOString()),
        supabase.from("activities").select("created_at").gte("created_at", startDate.toISOString()),
      ]);

      if (opportunitiesResult.error) throw opportunitiesResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      const seed = new Map<string, DashboardTrendPoint>();
      for (let offset = 5; offset >= 0; offset -= 1) {
        const date = subMonths(new Date(), offset);
        const key = format(date, "yyyy-MM");
        seed.set(key, {
          month: format(date, "MMM yy"),
          opportunities: 0,
          activities: 0,
        });
      }

      (opportunitiesResult.data ?? []).forEach((row) => {
        if (!row.created_at) return;
        const key = format(new Date(row.created_at), "yyyy-MM");
        const point = seed.get(key);
        if (!point) return;
        point.opportunities += 1;
      });

      (activitiesResult.data ?? []).forEach((row) => {
        if (!row.created_at) return;
        const key = format(new Date(row.created_at), "yyyy-MM");
        const point = seed.get(key);
        if (!point) return;
        point.activities += 1;
      });

      return Array.from(seed.values());
    },
  });
};
