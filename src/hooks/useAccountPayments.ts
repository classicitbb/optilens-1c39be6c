import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AccountPaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  reference: string | null;
  statementId: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

const CONFIRMED_STATUSES = ["confirmed", "settled", "approved", "completed", "paid"];

/**
 * Statement/account payments for the signed-in portal user (or the emulated
 * user when staff are viewing a customer). Only confirmed payments are
 * surfaced — pending intents belong to the statements flow, not order history.
 */
export const useAccountPayments = (targetUserId?: string) => {
  const { user } = useAuth();
  const effectiveUserId = targetUserId ?? user?.id ?? null;

  return useQuery({
    queryKey: ["account-payments", effectiveUserId],
    enabled: !!effectiveUserId,
    staleTime: 30_000,
    queryFn: async (): Promise<AccountPaymentRecord[]> => {
      const { data, error } = await (supabase as any)
        .from("account_payments")
        .select("id,amount,currency,status,provider,bank_reference,gateway_oid,statement_id,created_at,confirmed_at")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((row: any) => CONFIRMED_STATUSES.includes(String(row.status ?? "").toLowerCase()))
        .map((row: any) => ({
          id: String(row.id),
          amount: Number(row.amount ?? 0),
          currency: String(row.currency ?? "USD"),
          status: String(row.status ?? "confirmed"),
          provider: String(row.provider ?? ""),
          reference: row.bank_reference ?? row.gateway_oid ?? null,
          statementId: row.statement_id ?? null,
          createdAt: String(row.created_at),
          confirmedAt: row.confirmed_at ?? null,
        }));
    },
  });
};
