import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type LiveHelpdeskEvent = {
  ticket_id?: string;
  kind?: "message_created" | "customer_message" | "ticket_created" | "ticket_updated";
};

const invalidateTicket = (queryClient: ReturnType<typeof useQueryClient>, ticketId: string) => {
  void queryClient.invalidateQueries({ queryKey: ["helpdesk-ticket-messages", ticketId] });
  void queryClient.invalidateQueries({ queryKey: ["helpdesk-ticket-timeline", ticketId] });
  void queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets", ticketId] });
  void queryClient.invalidateQueries({ queryKey: ["portal-helpdesk-messages", ticketId] });
  void queryClient.invalidateQueries({ queryKey: ["portal-helpdesk-ticket", ticketId] });
  void queryClient.invalidateQueries({ queryKey: ["customer-helpdesk"] });
  void queryClient.invalidateQueries({ queryKey: ["customer-command-center"] });
};

/**
 * Live delivery is intentionally identifier-only. The normal, RLS-protected
 * ticket query remains the source of message content after every event.
 */
export const useLiveHelpdeskTicketUpdates = (ticketId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`helpdesk:ticket:${ticketId}`, { config: { private: true } })
      .on("broadcast", { event: "message_created" }, () => invalidateTicket(queryClient, ticketId))
      .on("broadcast", { event: "ticket_updated" }, () => invalidateTicket(queryClient, ticketId))
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, ticketId]);
};

/** Mounted once in the admin shell so the office learns about every new ticket or customer reply. */
export const useLiveHelpdeskInboxUpdates = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const handleEvent = (payload: { payload?: LiveHelpdeskEvent }) => {
      const event = payload.payload;
      const ticketId = event?.ticket_id;
      void queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["helpdesk-overview-tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["operator-attention-helpdesk-tickets"] });
      if (ticketId) invalidateTicket(queryClient, ticketId);

      if (event?.kind === "customer_message" || event?.kind === "ticket_created") {
        toast({
          title: event.kind === "customer_message" ? "New customer reply" : "New Helpdesk ticket",
          description: "Helpdesk has been updated without a page refresh.",
        });
      }
    };

    const channel = supabase
      .channel("helpdesk:inbox", { config: { private: true } })
      .on("broadcast", { event: "customer_message" }, handleEvent)
      .on("broadcast", { event: "ticket_created" }, handleEvent)
      .on("broadcast", { event: "ticket_updated" }, handleEvent)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
};
