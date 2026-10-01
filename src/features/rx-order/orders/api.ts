// Customer-side reads and the cancel action for Rx orders. Everything goes through the
// SECURITY DEFINER functions in 20261002100000_rx_my_orders.sql: customers never read
// rx_order_submissions or rx_order_events directly.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RxOrderFacts } from "./lifecycle";

const KEY = ["my-rx-orders"] as const;

export const useMyRxOrders = (enabled = true) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, "list", user?.id],
    enabled: enabled && !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<RxOrderFacts[]> => {
      const { data, error } = await (supabase.rpc as any)("list_my_rx_orders");
      if (error) throw new Error(error.message);
      return (data ?? []) as RxOrderFacts[];
    },
  });
};

export const useMyRxOrder = (quoteId: string | undefined) =>
  useQuery({
    queryKey: [...KEY, "one", quoteId],
    enabled: !!quoteId,
    queryFn: async (): Promise<RxOrderFacts> => {
      const { data, error } = await (supabase.rpc as any)("get_my_rx_order_status", { p_quote_id: quoteId });
      if (error) throw new Error(error.message);
      return data as RxOrderFacts;
    },
  });

export const useCancelMyRxOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await (supabase.rpc as any)("cancel_my_rx_order", { p_quote_id: quoteId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
