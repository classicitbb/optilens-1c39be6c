import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AddonPricingSheet {
  id: string;
  addon_id: string;
  pricing_sheet_id: string;
  price_override: number | null;
  created_at: string;
}

export const useAddonPricingSheets = (addonId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery<AddonPricingSheet[]>({
    queryKey: ["addon-pricing-sheets", addonId],
    enabled: !!addonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addon_pricing_sheets") as any)
        .select("*")
        .eq("addon_id", addonId!);
      if (error) throw error;
      return data as unknown as AddonPricingSheet[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      addonId,
      assignments,
    }: {
      addonId: string;
      assignments: { pricing_sheet_id: string; price_override: number | null }[];
    }) => {
      // Delete existing
      const { error: delErr } = await supabase
        .from("addon_pricing_sheets") as any)
        .delete()
        .eq("addon_id", addonId);
      if (delErr) throw delErr;

      if (assignments.length === 0) return;

      const rows = assignments.map((a) => ({
        addon_id: addonId,
        pricing_sheet_id: a.pricing_sheet_id,
        price_override: a.price_override,
      }));
      const { error: insErr } = await supabase
        .from("addon_pricing_sheets") as any)
        .insert(rows as any);
      if (insErr) throw insErr;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["addon-pricing-sheets", vars.addonId] });
    },
  });

  return { ...query, saveMutation };
};
