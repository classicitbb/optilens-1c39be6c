import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RxSubmissionRow } from "../types";
import { toast } from "@/hooks/use-toast";
import { gatekeeperStatusToast, type GatekeeperStatusOutcome } from "../gatekeeperOutcomes";


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

  const sendToGatekeeper = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("gatekeeper-orders", {
      body: { action: "send", orderKind: "rx", submissionId: id },
    });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.error || "Gatekeeper did not confirm receipt of the order.");
    return data as { delivery?: "fallback_queued"; provider?: "innovations"; message?: string };
  };

  const approveMutation = useMutation({
    mutationFn: async ({ id, provider }: { id: string; provider: "innovations" | "gatekeeper" }) => {
      const { error } = await (supabase.rpc as any)("approve_rx_submission", { p_id: id, p_dispatch_provider: provider });
      if (error) throw error;
      return provider === "gatekeeper" ? await sendToGatekeeper(id) : null;
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Release failed", description: error.message }),
    onSuccess: (result) => {
      if (result?.delivery === "fallback_queued") {
        toast({ title: "Queued for Innovations", description: "Gatekeeper was unavailable before sending. Delivery is pending until OptiLens Local reports file drop." });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["rx-order-submissions"] }),
  });

  // A row that was approved but whose Gatekeeper send never landed stays in
  // `approved` with no receipt. Without this it is a dead end — the approve
  // path refuses to claim it a second time.
  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      await sendToGatekeeper(id);
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Send failed", description: error.message }),
    onSuccess: (result) => toast(result?.delivery === "fallback_queued"
      ? { title: "Queued for Innovations", description: "Delivery is pending until OptiLens Local reports file drop." }
      : { title: "Sent to Gatekeeper", description: "Gatekeeper accepted the order." }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["rx-order-submissions"] }),
  });

  const pullStatusesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gatekeeper-orders", {
        body: { action: "pull-statuses" },
      });
      if (error) throw new Error(error.message);
      return data as GatekeeperStatusOutcome;
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Status refresh failed", description: error.message }),
    onSuccess: (data) => toast(gatekeeperStatusToast(data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["rx-order-submissions"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)("cancel_rx_submission", { p_id: id });
      if (error) throw error;
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Cancel failed", description: error.message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rx-order-submissions"] }),
  });

  return { ...query, approveMutation, resendMutation, pullStatusesMutation, cancelMutation };
};

