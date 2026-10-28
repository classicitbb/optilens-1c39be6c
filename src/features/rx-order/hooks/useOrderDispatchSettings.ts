import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderDispatchSettings { auto_transmit: boolean; default_provider: "gatekeeper" }
export async function readOrderDispatchSettings(): Promise<OrderDispatchSettings> {
  const { data, error } = await supabase.rpc("get_order_dispatch_settings" as never);
  if (error) throw error;
  return data as unknown as OrderDispatchSettings;
}
export function useOrderDispatchSettings() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["order-dispatch-settings"], queryFn: readOrderDispatchSettings, staleTime: 0, refetchInterval: 15000 });
  const change = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.rpc("set_order_auto_transmit" as never, { p_enabled: enabled } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order-dispatch-settings"] }),
  });
  return { ...query, change };
}
