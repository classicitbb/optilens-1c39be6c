import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HelpdeskAttachment } from "@/lib/helpdeskAttachments";

export const helpdeskAttachmentQueryKeys = {
  list: (ticketId: string) => ["helpdesk-ticket-attachments", ticketId] as const,
};

export const useHelpdeskAttachments = (ticketId: string | undefined) =>
  useQuery({
    queryKey: helpdeskAttachmentQueryKeys.list(ticketId ?? ""),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_attachments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as HelpdeskAttachment[];
    },
  });
