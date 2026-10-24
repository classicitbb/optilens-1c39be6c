import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { helpdeskTicketQueryKeys } from "./useHelpdeskTickets";
import { toast } from "@/hooks/use-toast";

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
  sourceChannel?: "manual" | "email" | "phone" | "chat" | "portal" | "api" | "ai_assistant";
  /** Email the ticket's audience (the person, or every contact of a company). Off unless set. */
  notifyContact?: boolean;
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

      try {
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
      } catch {
        toast({ title: "Ticket created, but its timeline could not be updated", description: "Open the existing ticket; do not submit it again.", variant: "destructive" });
      }

      if (payload.partner_contact_id && input.notifyContact === true) {
        // Best effort: the ticket exists even if the notification fails.
        try {
          const { data: emailResult, error: emailErr } = await supabase.functions.invoke("helpdesk-email", {
            body: { type: "ticket_created", ticketId },
          });
          if (emailErr) throw emailErr;
          if (emailResult?.error || emailResult?.skipped || emailResult?.ok !== true) {
            throw new Error(emailResult?.error || (emailResult?.skipped ? "No eligible email recipients were found." : "Email delivery was not confirmed."));
          }
        } catch (error) {
          toast({ title: "Ticket created, but customer email was not sent", description: error instanceof Error ? error.message : "Open the existing ticket; do not submit it again.", variant: "destructive" });
        }
      }

      return ticketId;
    },
    onSuccess: (ticketId) => {
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.all });
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.detail(ticketId) });
      qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.timeline(ticketId) });
    },
  });
};
