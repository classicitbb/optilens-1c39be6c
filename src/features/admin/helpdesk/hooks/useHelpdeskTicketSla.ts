import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TicketSlaStatus {
  id: string;
  policy_id: string;
  deadline_at: string;
  reached_at: string | null;
  status: "in_progress" | "reached" | "failed";
  policy: {
    id: string;
    name: string;
    target_hours: number;
  };
}

/** All SLA statuses for a ticket, joined with policy names. */
export const useHelpdeskTicketSlaStatuses = (ticketId: string | undefined) =>
  useQuery({
    queryKey: ["helpdesk-ticket-sla-statuses", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_sla_status")
        .select("id,policy_id,deadline_at,reached_at,status,policy:helpdesk_sla_policies(id,name,target_hours)")
        .eq("ticket_id", ticketId)
        .order("deadline_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TicketSlaStatus[];
    },
  });

/** All active SLA policies for a given team (or all teams if teamId is null). */
export const useHelpdeskTeamSlaPolicies = (teamId: string | null | undefined) =>
  useQuery({
    queryKey: ["helpdesk-sla-policies", "team", teamId ?? "all"],
    queryFn: async () => {
      let query = (supabase as any)
        .from("helpdesk_sla_policies")
        .select("id,name,target_hours")
        .eq("active", true)
        .order("name");
      if (teamId) {
        query = query.eq("team_id", teamId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; target_hours: number }[];
    },
  });

/** Manually assign (upsert) an SLA policy to a ticket. */
export const useAssignHelpdeskSlaPolicy = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      ticketId,
      policyId,
      targetHours,
      openedAt,
    }: {
      ticketId: string;
      policyId: string;
      targetHours: number;
      openedAt?: string | null;
    }) => {
      const ref = openedAt ? new Date(openedAt) : new Date();
      const deadlineAt = new Date(ref.getTime() + targetHours * 3_600_000).toISOString();
      const { error } = await (supabase as any)
        .from("helpdesk_ticket_sla_status")
        .upsert(
          { ticket_id: ticketId, policy_id: policyId, deadline_at: deadlineAt, reached_at: null, status: "in_progress" },
          { onConflict: "ticket_id,policy_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_data, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ["helpdesk-ticket-sla-statuses", ticketId] });
      qc.invalidateQueries({ queryKey: ["helpdesk-ticket-sla-status", ticketId] });
      toast({ title: "SLA policy applied" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to apply SLA policy", description: err.message, variant: "destructive" }),
  });
};

/** Remove a single SLA policy assignment from a ticket. */
export const useRemoveHelpdeskSlaPolicy = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ slaStatusId }: { slaStatusId: string; ticketId: string }) => {
      const { error } = await (supabase as any)
        .from("helpdesk_ticket_sla_status")
        .delete()
        .eq("id", slaStatusId);
      if (error) throw error;
    },
    onSuccess: (_data, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ["helpdesk-ticket-sla-statuses", ticketId] });
      qc.invalidateQueries({ queryKey: ["helpdesk-ticket-sla-status", ticketId] });
      toast({ title: "SLA policy removed" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to remove SLA policy", description: err.message, variant: "destructive" }),
  });
};
