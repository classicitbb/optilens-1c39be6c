import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { helpdeskTicketQueryKeys } from "./useHelpdeskTickets";

export interface HelpdeskTicketEvent {
  id: string;
  ticket_id: string;
  event_type: string;
  actor_user_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export const useHelpdeskTicketTimeline = (ticketId?: string) => {
  return useQuery({
    queryKey: helpdeskTicketQueryKeys.timeline(ticketId ?? ""),
    enabled: Boolean(ticketId),
    queryFn: async () => {
      if (!ticketId) return [] as HelpdeskTicketEvent[];

      const { data, error } = await supabase
        .from("helpdesk_ticket_events")
        .select("id,ticket_id,event_type,actor_user_id,payload,created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as HelpdeskTicketEvent[];
    },
  });
};
