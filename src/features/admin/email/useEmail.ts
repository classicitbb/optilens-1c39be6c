import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emailBridge, getEmailBridgeUrl } from "@/lib/emailBridge";

const REFRESH_MS = 60_000;

export function useEmailStatus() {
  return useQuery({
    queryKey: ["email", "status"],
    queryFn: emailBridge.status,
    enabled: Boolean(getEmailBridgeUrl()),
    retry: false,
    refetchInterval: REFRESH_MS,
  });
}

export function useEmailFolders(account: string | null) {
  return useQuery({
    queryKey: ["email", "folders", account],
    queryFn: () => emailBridge.folders(account as string),
    enabled: Boolean(account),
    refetchInterval: REFRESH_MS,
  });
}

export function useEmailMessages(folderId: number | null, search: string) {
  return useQuery({
    queryKey: ["email", "messages", folderId, search],
    queryFn: () => emailBridge.messages(folderId as number, search || undefined),
    enabled: folderId !== null,
    refetchInterval: REFRESH_MS,
  });
}

export function useEmailMessage(messageId: number | null) {
  return useQuery({
    queryKey: ["email", "message", messageId],
    queryFn: () => emailBridge.message(messageId as number),
    enabled: messageId !== null,
  });
}

export function useEmailHistory(addresses: string[]) {
  return useQuery({
    queryKey: ["email", "history", addresses],
    queryFn: () => emailBridge.history(addresses),
    enabled: addresses.length > 0 && Boolean(getEmailBridgeUrl()),
    retry: false,
  });
}

export function useInvalidateEmail() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["email"] });
}

export function useSetEmailFlags() {
  const invalidate = useInvalidateEmail();
  return useMutation({
    mutationFn: ({ id, ...flags }: { id: number; is_read?: boolean; is_flagged?: boolean }) => emailBridge.setFlags(id, flags),
    onSuccess: invalidate,
  });
}

export function useMoveEmail() {
  const invalidate = useInvalidateEmail();
  return useMutation({
    mutationFn: ({ id, to }: { id: number; to: "archive" | "trash" | "inbox" | "junk" }) => emailBridge.move(id, to),
    onSuccess: invalidate,
  });
}

export function useSendEmail() {
  const invalidate = useInvalidateEmail();
  return useMutation({ mutationFn: emailBridge.send, onSuccess: invalidate });
}

export function useConnectMailbox() {
  const invalidate = useInvalidateEmail();
  return useMutation({ mutationFn: emailBridge.connectAccount, onSuccess: invalidate });
}

export function useMailboxAccess() {
  const invalidate = useInvalidateEmail();
  return {
    share: useMutation({ mutationFn: ({ code, email }: { code: string; email: string }) => emailBridge.shareAccount(code, email), onSuccess: invalidate }),
    unshare: useMutation({ mutationFn: ({ code, email }: { code: string; email: string }) => emailBridge.unshareAccount(code, email), onSuccess: invalidate }),
    disconnect: useMutation({ mutationFn: (code: string) => emailBridge.disconnectAccount(code), onSuccess: invalidate }),
  };
}

export type CrmContactMatch = {
  id: string;
  name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  is_customer: boolean;
  linked_customer_id: number | null;
};

// CRM contacts whose email field (which can hold a list) contains the address.
export function useCrmContactByEmail(address: string | null | undefined) {
  return useQuery({
    queryKey: ["email", "crm-contact", address],
    queryFn: async () => {
      const { data, error } = await (supabase.from("contacts") as any)
        .select("id, name, business_name, email, phone, is_customer, linked_customer_id")
        .ilike("email", `%${String(address).replace(/[%_\\]/g, "\\$&")}%`)
        .eq("is_archived", false)
        .limit(5);
      if (error) throw error;
      return (data ?? []) as CrmContactMatch[];
    },
    enabled: Boolean(address),
    staleTime: 5 * 60_000,
  });
}
