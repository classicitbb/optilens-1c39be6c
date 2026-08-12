import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RxSubmissionRow } from "../types";

// Outbox admin: list + approve/cancel (manual-release gate). Innovations is
// claimed by the office worker; Gatekeeper is sent by its authenticated Edge
// Function and stores only Gatekeeper's immediate receipt.
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
    mutationFn: async ({ id, provider }: { id: string; provider: "innovations" | "gatekeeper" }) => {
      const { error } = await (supabase.rpc as any)("approve_rx_submission", { p_id: id, p_dispatch_provider: provider });
      if (error) throw error;
      if (provider === "gatekeeper") {
        const { data, error: sendError } = await supabase.functions.invoke("gatekeeper-orders", {
          body: { action: "send", orderKind: "rx", submissionId: id },
        });
        if (sendError) throw new Error(sendError.message);
        if (!data?.ok) throw new Error(data?.error || "Gatekeeper did not confirm receipt of the order.");
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["rx-order-submissions"] }),
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
