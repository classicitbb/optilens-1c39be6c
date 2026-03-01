import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HelpdeskTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: number;
  team_id: string | null;
  stage_id: string | null;
  owner_user_id: string | null;
  deadline: string | null;
  opened_at: string | null;
  assigned_at: string | null;
  closed_at: string | null;
  source_channel: string;
  created_at: string;
  updated_at: string;
  stage?: {
    id: string;
    name: string;
    is_closed: boolean;
    is_folded: boolean;
    sequence: number;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
}

export interface HelpdeskTicketFilters {
  search?: string;
  teamId?: string;
  stageId?: string;
  ownerUserId?: string;
  priority?: number;
  onlyOpen?: boolean;
  limit?: number;
}

export const helpdeskTicketQueryKeys = {
  all: ["helpdesk-tickets"] as const,
  list: (filters?: HelpdeskTicketFilters) => ["helpdesk-tickets", filters ?? {}] as const,
  detail: (ticketId: string) => ["helpdesk-tickets", ticketId] as const,
  timeline: (ticketId: string) => ["helpdesk-ticket-timeline", ticketId] as const,
};

const normalizeFilters = (filters?: HelpdeskTicketFilters): HelpdeskTicketFilters => ({
  search: filters?.search?.trim() || undefined,
  teamId: filters?.teamId || undefined,
  stageId: filters?.stageId || undefined,
  ownerUserId: filters?.ownerUserId || undefined,
  priority: typeof filters?.priority === "number" ? filters.priority : undefined,
  onlyOpen: filters?.onlyOpen ?? false,
  limit: filters?.limit ?? 200,
});

export const useHelpdeskTickets = (filters?: HelpdeskTicketFilters) => {
  const normalized = normalizeFilters(filters);

  return useQuery({
    queryKey: helpdeskTicketQueryKeys.list(normalized),
    queryFn: async () => {
      let query = supabase
        .from("helpdesk_tickets")
        .select(
          "id,ticket_number,title,description,priority,team_id,stage_id,owner_user_id,deadline,opened_at,assigned_at,closed_at,source_channel,created_at,updated_at,stage:helpdesk_ticket_stages(id,name,is_closed,is_folded,sequence),team:helpdesk_teams(id,name)"
        )
        .order("created_at", { ascending: false })
        .limit(normalized.limit ?? 200);

      if (normalized.search) {
        query = query.or(`title.ilike.%${normalized.search}%,ticket_number.ilike.%${normalized.search}%`);
      }

      if (normalized.teamId) {
        query = query.eq("team_id", normalized.teamId);
      }

      if (normalized.stageId) {
        query = query.eq("stage_id", normalized.stageId);
      }

      if (normalized.ownerUserId) {
        query = query.eq("owner_user_id", normalized.ownerUserId);
      }

      if (typeof normalized.priority === "number") {
        query = query.eq("priority", normalized.priority);
      }

      if (normalized.onlyOpen) {
        query = query.is("closed_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []) as unknown as HelpdeskTicket[];
    },
  });
};
