import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { helpdeskTicketQueryKeys } from "./useHelpdeskTickets";

interface UpdateHelpdeskTicketStageInput {
  ticketId: string;
  stageId: string;
  actorUserId?: string | null;
}

export const useUpdateHelpdeskTicketStage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, stageId, actorUserId }: UpdateHelpdeskTicketStageInput) => {
      const { data: previous, error: getError } = await (supabase as any)
        .from("helpdesk_tickets")
        .select("id,stage_id,owner_user_id")
        .eq("id", ticketId)
        .single();

      if (getError) throw getError;

      const { error: updateError } = await (supabase as any)
        .from("helpdesk_tickets")
        .update({
          stage_id: stageId,
          closed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      const { error: eventError } = await (supabase as any)
        .from("helpdesk_ticket_events")
        .insert({
          ticket_id: ticketId,
          event_type: "stage_updated",
          actor_user_id: actorUserId || null,
          payload: {
            previous_stage_id: previous?.stage_id ?? null,
            next_stage_id: stageId,
            owner_user_id: previous?.owner_user_id ?? null,
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
