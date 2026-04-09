import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerPricingAccess {
  id: string;
  user_id: string;
  pricing_sheet_id: string;
  created_at: string;
}

export const useCustomerPricingAccess = (userId?: string) => {
  const qc = useQueryClient();

  const { data: access = [], isLoading } = useQuery({
    queryKey: ["customer-pricing-access", userId],
    queryFn: async () => {
      const query = (supabase.from("customer_pricing_access") as any).select("*");
      if (userId) query.eq("user_id", userId);
      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerPricingAccess[];
    },
    enabled: userId !== undefined,
  });

  const assign = useMutation({
    mutationFn: async ({ userId: uid, sheetId }: { userId: string; sheetId: string }) => {
      const { error } = await (supabase.from("customer_pricing_access") as any)
        .insert({ user_id: uid, pricing_sheet_id: sheetId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-pricing-access"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("customer_pricing_access") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-pricing-access"] }),
  });

  return { access, isLoading, assign, remove };
};
