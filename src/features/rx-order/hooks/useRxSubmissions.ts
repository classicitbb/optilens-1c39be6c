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

  const sendToGatekeeper = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("gatekeeper-orders", {
      body: { action: "send", orderKind: "rx", submissionId: id },
    });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.error || "Gatekeeper did not confirm receipt of the order.");
  };

  const approveMutation = useMutation({
    mutationFn: async ({ id, provider }: { id: string; provider: "innovations" | "gatekeeper" }) => {
      const { error } = await (supabase.rpc as any)("approve_rx_submission", { p_id: id, p_dispatch_provider: provider });
      if (error) throw error;
      if (provider === "gatekeeper") await sendToGatekeeper(id);
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Release failed", description: error.message }),
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
    onSuccess: () => toast({ title: "Sent to Gatekeeper", description: "Gatekeeper accepted the order." }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["rx-order-submissions"] }),
  });

  const pullStatusesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gatekeeper-orders", {
        body: { action: "pull-statuses" },
      });
      if (error) throw new Error(error.message);
      return data as { pulled?: boolean; reason?: string; updated?: number };
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Status refresh failed", description: error.message }),
    onSuccess: (data) => {
      if (data?.pulled) toast({ title: "Lab statuses refreshed", description: `${data.updated ?? 0} order(s) updated.` });
      else if (data?.reason === "throttled") toast({ title: "Already up to date", description: "Lab statuses refresh at most every 5 minutes." });
      else toast({ title: "No statuses available", description: "The lab's status feed did not return any jobs." });
    },
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

