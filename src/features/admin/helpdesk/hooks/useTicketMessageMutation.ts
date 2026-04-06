import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { helpdeskMessageQueryKeys } from "./useHelpdeskMessages";
import { helpdeskTicketQueryKeys } from "./useHelpdeskTickets";

interface SendMessageParams {
  ticketId: string;
  direction: "inbound" | "outbound" | "internal_note";
  body: string;
  senderName?: string;
  senderEmail?: string;
  /** If true and ticket has no first_response_at, sets it to now() */
  setFirstResponse?: boolean;
}

export const useTicketMessageMutation = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      ticketId,
      direction,
      body,
      senderName,
      senderEmail,
      setFirstResponse,
    }: SendMessageParams) => {
      const db = supabase as any;

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id ?? null;

      // Insert the message
      const { data: msg, error: msgError } = await db
        .from("helpdesk_ticket_messages")
        .insert({
          ticket_id: ticketId,
          direction,
          body,
          sender_user_id: userId,
          sender_name: senderName ?? null,
          sender_email: senderEmail ?? null,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // If this is an outbound reply and we should mark first response
      if (direction === "outbound" && setFirstResponse) {
        const { data: ticket } = await db
          .from("helpdesk_tickets")
          .select("first_response_at")
          .eq("id", ticketId)
          .single();

        if (ticket && !ticket.first_response_at) {
          await db
            .from("helpdesk_tickets")
            .update({ first_response_at: new Date().toISOString() })
            .eq("id", ticketId);
        }
      }

      // Log event for outbound replies (not internal notes)
      if (direction !== "internal_note") {
        await db.from("helpdesk_ticket_events").insert({
          ticket_id: ticketId,
          event_type: direction === "outbound" ? "reply_sent" : "customer_reply",
          actor_user_id: userId,
          payload: { message_id: msg.id },
        });
      }

      return msg;
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
