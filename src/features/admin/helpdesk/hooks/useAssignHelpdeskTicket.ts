import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { helpdeskTicketQueryKeys } from "./useHelpdeskTickets";

interface AssignHelpdeskTicketInput {
  ticketId: string;
  ownerUserId: string | null;
  actorUserId?: string | null;
}

export const useAssignHelpdeskTicket = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, ownerUserId, actorUserId }: AssignHelpdeskTicketInput) => {
      const { data: previous, error: getError } = await (supabase as any)
        .from("helpdesk_tickets")
        .select("id,owner_user_id")
        .eq("id", ticketId)
        .single();

      if (getError) throw getError;

      const nowIso = new Date().toISOString();
      const { error: updateError } = await (supabase as any)
        .from("helpdesk_tickets")
        .update({
          owner_user_id: ownerUserId,
          assigned_at: ownerUserId ? nowIso : null,
          updated_at: nowIso,
        })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      const { error: eventError } = await (supabase as any)
        .from("helpdesk_ticket_events")
        .insert({
          ticket_id: ticketId,
          event_type: ownerUserId ? "ticket_assigned" : "ticket_unassigned",
          actor_user_id: actorUserId || null,
          payload: {
            previous_owner_user_id: previous?.owner_user_id ?? null,
            next_owner_user_id: ownerUserId,
          },
        });

      if (eventError) throw eventError;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.all });
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.detail(variables.ticketId) });
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.timeline(variables.ticketId) });
    },
  });
};
