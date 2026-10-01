// Data for the Rx Orders workspace: the outbox (via useRxSubmissions, which also
// owns release / retry / resend / cancel), the capture queue, and the quote numbers
// for captures that have already become quotes.
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAccounts } from "@/hooks/useCustomerAccounts";
import { useRxSubmissions } from "../hooks/useRxSubmissions";
import { buildItems, type CaptureRow } from "./classify";

export function useRxWorkspace() {
  const qc = useQueryClient();
  const outbox = useRxSubmissions();
  const { data: accounts = [] } = useCustomerAccounts();

  const captures = useQuery<CaptureRow[]>({
    queryKey: ["rx-workspace-captures"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("rx_capture_jobs" as never) as any)
        .select("id, account_id, source, status, error, quote_id, created_at, storage_path, file_name")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as CaptureRow[];
    },
  });

  const quoteIds = useMemo(
    () => [...new Set((captures.data ?? []).map((c) => c.quote_id).filter((q): q is string => !!q))].sort(),
    [captures.data],
  );
  const quoteNumbers = useQuery<Map<string, string>>({
    queryKey: ["rx-workspace-quote-numbers", quoteIds],
    enabled: quoteIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quotes") as any).select("id, quote_number").in("id", quoteIds);
      if (error) throw error;
      return new Map((data as { id: string; quote_number: string }[]).map((q) => [q.id, q.quote_number]));
    },
  });

  const accountName = (id: number | null) => accounts.find((a) => a.id === id)?.name ?? "—";
  const items = useMemo(
    () => buildItems({
      submissions: outbox.data ?? [], captures: captures.data ?? [],
      accountName: (id) => accounts.find((a) => a.id === id)?.name ?? "—",
      quoteNumbers: quoteNumbers.data ?? new Map(),
    }),
    [outbox.data, captures.data, accounts, quoteNumbers.data],
  );

  return {
    items,
    isLoading: outbox.isLoading || captures.isLoading,
    outbox,
    accountName,
    refresh: () => {
      void qc.invalidateQueries({ queryKey: ["rx-order-submissions"] });
      void qc.invalidateQueries({ queryKey: ["rx-workspace-captures"] });
    },
  };
}

export type CustomerEvent = "released" | "shipped";

/** Email the account's customer about a released order — always a deliberate staff action. */
export async function emailCustomer(submissionId: string, event: CustomerEvent): Promise<"sent" | "already_sent" | "suppressed"> {
  const { data, error } = await supabase.functions.invoke("rx-order-notify", { body: { action: "customer", submissionId, event } });
  if (error) {
    let message = error.message;
    try { message = (await (error as { context?: Response }).context?.json?.())?.error ?? message; } catch { /* keep the transport message */ }
    throw new Error(message);
  }
  return (data?.status ?? "sent") as "sent" | "already_sent" | "suppressed";
}

export interface RxOrderDetail {
  quote: { id: string; quote_number: string; status: string; rx_payload: unknown; notes_internal: string | null } | null;
  lines: { id: string; item_name: string; line_type: string; qty: number; unit_sell_price_bbd: number }[];
  events: { id: string; event: string; from_status: string | null; to_status: string | null; detail: Record<string, unknown>; created_at: string }[];
}

/** Everything the drawer shows that is not already on the row. */
export function useRxOrderDetail(quoteId: string | null) {
  return useQuery<RxOrderDetail>({
    queryKey: ["rx-order-detail", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const [quote, lines, events] = await Promise.all([
        (supabase.from("quotes") as any).select("id, quote_number, status, rx_payload, notes_internal").eq("id", quoteId).maybeSingle(),
        (supabase.from("quote_lines") as any).select("id, item_name, line_type, qty, unit_sell_price_bbd").eq("quote_id", quoteId).order("created_at"),
        (supabase.from("rx_order_events" as never) as any).select("id, event, from_status, to_status, detail, created_at").eq("quote_id", quoteId).order("created_at"),
      ]);
      if (quote.error) throw quote.error;
      return { quote: quote.data ?? null, lines: lines.data ?? [], events: events.data ?? [] };
    },
  });
}

/** A signed link to a capture's original, valid for an hour. */
export function useCaptureImage(path: string | null) {
  return useQuery<string | null>({
    queryKey: ["rx-capture-image", path],
    enabled: !!path,
    staleTime: 30 * 60_000,
    queryFn: async () => (await supabase.storage.from("rx-captures").createSignedUrl(path as string, 3600)).data?.signedUrl ?? null,
  });
}
