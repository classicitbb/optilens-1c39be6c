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

      // Check if the target stage is a closed stage so we can set closed_at correctly
      const { data: targetStage } = await (supabase as any)
        .from("helpdesk_ticket_stages")
        .select("is_closed")
        .eq("id", stageId)
        .maybeSingle();

      const now = new Date().toISOString();
      const { error: updateError } = await (supabase as any)
        .from("helpdesk_tickets")
        .update({
          stage_id: stageId,
          closed_at: targetStage?.is_closed ? now : null,
          updated_at: now,
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
