import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPriceOverride {
  row_key: string;
  custom_price: number;
  currency_code: string;
}

const QUERY_KEY = ["user-price-overrides"] as const;

// One user's own retail prices, typed in over the wholesale pricelist
// instead of the Show/Hide blur. Keyed by an arbitrary caller-defined
// row_key (see buildCatalogRowKey/buildMatrixRowKey in
// AssignedPricelistsSection.tsx) — this table has no relationship to
// pricelist_versions/pricelist_lines/pricing_sheets, it's private per-user
// data layered on top of whichever wholesale row the key names.
export const useUserPriceOverrides = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<Map<string, UserPriceOverride>>({
    queryKey: QUERY_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from("user_price_overrides") as any)
        .select("row_key, custom_price, currency_code")
        .eq("user_id", user!.id);
      if (error) throw error;
      const map = new Map<string, UserPriceOverride>();
      (data ?? []).forEach((row: UserPriceOverride) => map.set(row.row_key, row));
      return map;
    },
  });

  const setOverride = useMutation({
    mutationFn: async ({ rowKey, price, currencyCode }: { rowKey: string; price: number; currencyCode: string }) => {
      if (!user) throw new Error("Sign in to save your price.");
      const { error } = await (supabase.from("user_price_overrides") as any).upsert(
        { user_id: user.id, row_key: rowKey, custom_price: price, currency_code: currencyCode },
        { onConflict: "user_id,row_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const clearOverride = useMutation({
    mutationFn: async (rowKey: string) => {
      if (!user) return;
      const { error } = await (supabase.from("user_price_overrides") as any)
        .delete()
        .eq("user_id", user.id)
        .eq("row_key", rowKey);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    overrides: query.data ?? new Map<string, UserPriceOverride>(),
    isLoading: query.isLoading,
    setOverride,
    clearOverride,
  };
};
