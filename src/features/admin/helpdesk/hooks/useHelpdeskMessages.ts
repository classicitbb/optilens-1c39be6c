import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HelpdeskTicketMessage {
  id: string;
  ticket_id: string;
  direction: "inbound" | "outbound" | "internal_note";
  body: string;
  sender_user_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sent_at: string;
  created_at: string;
}

export const helpdeskMessageQueryKeys = {
  list: (ticketId: string) => ["helpdesk-ticket-messages", ticketId] as const,
};

export const useHelpdeskMessages = (ticketId: string | undefined) => {
  return useQuery({
    queryKey: helpdeskMessageQueryKeys.list(ticketId ?? ""),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_messages")
        .select("id,ticket_id,direction,body,sender_user_id,sender_name,sender_email,sent_at,created_at")
        .eq("ticket_id", ticketId)
        .order("sent_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as HelpdeskTicketMessage[];
    },
  });
};
