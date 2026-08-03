import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RxSubmissionRow } from "../types";

// Outbox admin: list + approve/cancel (manual-release gate). The actual
// submission to Innovations happens office-side in optilens-local — see
// lib/rx-order-submitter.js there; status moves approved → claimed →
// submitted|failed as the worker reports back.
export const useRxSubmissions = () => {
  const qc = useQueryClient();

  const query = useQuery<RxSubmissionRow[]>({
    queryKey: ["rx-order-submissions"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("rx_order_submissions") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as RxSubmissionRow[];
    },
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)("approve_rx_submission", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rx-order-submissions"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)("cancel_rx_submission", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rx-order-submissions"] }),
  });

  return { ...query, approveMutation, cancelMutation };
};
