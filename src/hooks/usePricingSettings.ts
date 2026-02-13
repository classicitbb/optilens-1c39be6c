import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PricingSettings {
  id: string;
  version: number;
  label: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  base_currency: string;
  fx_rates: Record<string, number>;
  fx_risk_buffer: number;
  vat_rate: number;
  duty_rates: Record<string, number>;
  brokerage_fee: number;
  port_charges: number;
  freight_method: string;
  insurance_percent: number;
  cost_of_capital: number;
  inventory_holding: number;
  avg_days_in_stock: number;
  overhead_percent: number;
  shrinkage_percent: number;
  target_margin: number;
  category_margin_floors: Record<string, number>;
  category_target_margins: Record<string, number>;
  max_price_increase: number;
  rounding_rule: number;
  psychological_rounding: boolean;
  block_below_floor: boolean;
  block_loss: boolean;
  require_concession_reason: boolean;
  price_reduction_threshold: number;
}

export const usePricingSettings = () => {
  const queryClient = useQueryClient();

  const versionsQuery = useQuery<PricingSettings[]>({
    queryKey: ["pricing_settings_versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("*")
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PricingSettings[];
    },
  });

  const saveNewVersion = useMutation({
    mutationFn: async (draft: Omit<PricingSettings, "id" | "created_at" | "created_by" | "version" | "is_active">) => {
      // Get current max version
      const { data: existing } = await supabase
        .from("pricing_settings")
        .select("version")
        .order("version", { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (existing?.version ?? 0) + 1;

      // Deactivate all previous
      await supabase
        .from("pricing_settings")
        .update({ is_active: false } as any)
        .eq("is_active", true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert new version
      const { error } = await supabase
        .from("pricing_settings")
        .insert({
          ...draft,
          version: nextVersion,
          is_active: true,
          created_by: user?.id ?? null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing_settings_versions"] }),
  });

  return { versions: versionsQuery.data ?? [], isLoading: versionsQuery.isLoading, saveNewVersion };
};
