import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { helpdeskMessageQueryKeys } from "./useHelpdeskMessages";
import { helpdeskTicketQueryKeys } from "./useHelpdeskTickets";

interface SendMessageParams {
  ticketId: string;
  direction: "inbound" | "outbound" | "internal_note";
  body: string;
}

export const useTicketMessageMutation = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      ticketId,
      direction,
      body,
    }: SendMessageParams) => {
      const db = supabase as any;
      if (direction === "inbound") throw new Error("Staff cannot send a customer-direction Helpdesk message.");

      const clientMessageId = crypto.randomUUID();
      const { data, error } = await db.rpc("send_helpdesk_ticket_message", {
        p_ticket_id: ticketId,
        p_body: body,
        p_client_message_id: clientMessageId,
        p_internal_note: direction === "internal_note",
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: helpdeskMessageQueryKeys.list(variables.ticketId) });
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.detail(variables.ticketId) });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });
};
