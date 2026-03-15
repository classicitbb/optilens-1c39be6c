import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { helpdeskTicketQueryKeys } from "./useHelpdeskTickets";

export interface CreateHelpdeskTicketInput {
  ticketNumber?: string;
  title: string;
  description?: string;
  teamId?: string | null;
  stageId?: string | null;
  ticketTypeId?: string | null;
  partnerContactId?: string | null;
  ownerUserId?: string | null;
  priority?: number;
  deadline?: string | null;
  sourceChannel?: "manual" | "email" | "phone" | "chat" | "portal" | "api" | "odoo_sync" | "ai_assistant";
}

const generateTicketNumber = () => `TCK-${Date.now().toString().slice(-8)}`;

export const useCreateHelpdeskTicket = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHelpdeskTicketInput) => {
      const now = new Date().toISOString();
      const payload = {
        ticket_number: input.ticketNumber || generateTicketNumber(),
        title: input.title.trim(),
        description: input.description?.trim() || "",
        team_id: input.teamId || null,
        stage_id: input.stageId || null,
        ticket_type_id: input.ticketTypeId || null,
        partner_contact_id: input.partnerContactId || null,
        owner_user_id: input.ownerUserId || null,
        priority: input.priority ?? 1,
        deadline: input.deadline || null,
        source_channel: input.sourceChannel || "manual",
        opened_at: now,
        assigned_at: input.ownerUserId ? now : null,
      };

      const { data, error } = await (supabase as any)
        .from("helpdesk_tickets")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      const ticketId = (data as { id: string }).id;

      const { error: eventErr } = await (supabase as any)
        .from("helpdesk_ticket_events")
        .insert({
          ticket_id: ticketId,
          event_type: "ticket_created",
          actor_user_id: input.ownerUserId || null,
          payload: {
            source_channel: payload.source_channel,
            initial_stage_id: payload.stage_id,
            initial_owner_user_id: payload.owner_user_id,
            priority: payload.priority,
          },
        });

      if (eventErr) throw eventErr;

      return ticketId;
    },
    onSuccess: (ticketId) => {
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.all });
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.detail(ticketId) });
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.timeline(ticketId) });
    },
  });
};
