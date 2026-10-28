import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
export interface ExtraInvoiceLine { description: string; quantity: number; unit_price: number }
export interface ExtraInvoice {
  id: string; invoice_number: string; account_id: number; order_id: string | null;
  rx_submission_id: string | null; stock_submission_id: string | null; user_id: string;
  lines: ExtraInvoiceLine[]; total_bbd: number; status: "paid" | "unpaid"; created_at: string;
}
export function useOrderExtraInvoices(scope: "own" | "staff" = "own") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["order-extra-invoices", user?.id, scope], enabled: !!user, refetchInterval: 15000,
    queryFn: async (): Promise<ExtraInvoice[]> => {
      const { data, error } = await supabase.rpc("list_order_extra_invoices" as never);
      if (error) throw error;
      const rows = (data ?? []) as unknown as ExtraInvoice[];
      return scope === "staff" ? rows : rows.filter((invoice) => invoice.user_id === user?.id);
    },
  });
}
export function useIssueExtraInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: "rx" | "stock"; submissionId: string; userId: string | null; lines: ExtraInvoiceLine[]; requestKey: string }) => {
      const { data, error } = await supabase.rpc("issue_order_extra_invoice" as never, {
        p_kind: input.kind, p_submission_id: input.submissionId, p_user_id: input.userId,
        p_lines: input.lines, p_request_key: input.requestKey,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order-extra-invoices"] }),
  });
}
export async function extraInvoicePaymentToken(invoiceId: string): Promise<string> {
  const { data, error } = await supabase.rpc("begin_order_extra_invoice_payment" as never, { p_invoice_id: invoiceId } as never);
  if (error) throw error;
  return String(data);
}
