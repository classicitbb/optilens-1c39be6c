import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { helpdeskTicketQueryKeys } from "./useHelpdeskTickets";

export interface HelpdeskTicketDetail {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: number;
  team_id: string | null;
  stage_id: string | null;
  owner_user_id: string | null;
  partner_contact_id: string | null;
  ticket_type_id: string | null;
  deadline: string | null;
  opened_at: string | null;
  assigned_at: string | null;
  closed_at: string | null;
  first_response_at: string | null;
  source_channel: string;
  customer_email: string | null;
  contact_token: string;
  sla_paused_at: string | null;
  sla_paused_duration_seconds: number;
  created_at: string;
  updated_at: string;
  stage: {
    id: string;
    name: string;
    is_closed: boolean;
    is_folded: boolean;
    sequence: number;
  } | null;
  team: {
    id: string;
    name: string;
  } | null;
  ticket_type: {
    id: string;
    name: string;
  } | null;
  partner_contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export const useHelpdeskTicketDetail = (ticketId: string | undefined) => {
  return useQuery({
    queryKey: helpdeskTicketQueryKeys.detail(ticketId ?? ""),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_tickets")
        .select(
          `id,ticket_number,title,description,priority,team_id,stage_id,owner_user_id,
          partner_contact_id,ticket_type_id,deadline,opened_at,assigned_at,closed_at,
          first_response_at,source_channel,customer_email,contact_token,
          sla_paused_at,sla_paused_duration_seconds,created_at,updated_at,
          stage:helpdesk_ticket_stages(id,name,is_closed,is_folded,sequence),
          team:helpdesk_teams(id,name),
          ticket_type:helpdesk_ticket_types(id,name),
          partner_contact:contacts!helpdesk_tickets_partner_contact_id_fkey(id,name,email,phone)`
        )
        .eq("id", ticketId)
        .single();

      if (error) throw error;
      return data as unknown as HelpdeskTicketDetail;
    },
  });
};
