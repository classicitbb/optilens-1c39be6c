import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const QUERY_KEY = ["user-currency-preference"] as const;

// One user's own persisted display-currency choice for the portal
// pricelist page, independent of the business-wide pricing_settings.
export const useUserCurrencyPreference = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<string | null>({
    queryKey: QUERY_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from("user_currency_preferences") as any)
        .select("currency_code")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.currency_code ?? null;
    },
  });

  const setPreference = useMutation({
    mutationFn: async (currencyCode: string) => {
      if (!user) throw new Error("Sign in to save your currency preference.");
      const { error } = await (supabase.from("user_currency_preferences") as any).upsert(
        { user_id: user.id, currency_code: currencyCode },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { preferredCurrency: query.data ?? null, isLoading: query.isLoading, setPreference };
};
