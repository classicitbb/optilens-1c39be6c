import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Read model for the retention alarm (see docs/CRM_BUILD_PLAN.md). Populated by
 * the optilens-local order_activity feed. `health` is computed in the
 * customer_order_health view: 'alarm' (>= 21 quiet days), 'flag' (>= 14, or past
 * the per-account baseline of avg_gap x 3), 'ok', or 'unknown'.
 */
export interface CustomerHealthRow {
  contact_id: string;
  name: string;
  pipeline: string | null;
  stage: string | null;
  last_order_date: string | null;
  quiet_days: number | null;
  avg_gap_days: number | null;
  orders_last_30_days: number | null;
  health: "alarm" | "flag" | "ok" | "unknown";
}

export const useCustomerHealth = () =>
  useQuery({
    queryKey: ["customer-health"],
    queryFn: async (): Promise<CustomerHealthRow[]> => {
      const { data, error } = await (supabase.from("customer_order_health") as any).select("*");
      // The feed may not be flowing yet, or the view grant may be pending — stay
      // resilient so the dashboard renders an empty state rather than erroring.
      if (error) return [];
      return (data ?? []) as CustomerHealthRow[];
    },
  });
