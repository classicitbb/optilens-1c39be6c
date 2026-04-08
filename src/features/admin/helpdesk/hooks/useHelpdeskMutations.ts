import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = () => supabase as any;

/* ── Tickets ── */

export const useDeleteHelpdeskTicket = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await db().from("helpdesk_tickets").delete().eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      toast({ title: "Ticket deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
};

export const useUpdateHelpdeskTicket = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; title?: string; description?: string; priority?: number; team_id?: string | null; ticket_type_id?: string | null; partner_contact_id?: string | null; deadline?: string | null }) => {
      const { error } = await db().from("helpdesk_tickets").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      qc.invalidateQueries({ queryKey: ["helpdesk-overview-tickets"] });
      toast({ title: "Ticket updated" });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });
};

/* ── Archive ticket (move to closed stage) ── */

export const useArchiveHelpdeskTicket = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ ticketId, closedStageId }: { ticketId: string; closedStageId: string }) => {
      const { error } = await db()
        .from("helpdesk_tickets")
        .update({ stage_id: closedStageId, closed_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      qc.invalidateQueries({ queryKey: ["helpdesk-overview-tickets"] });
      toast({ title: "Ticket archived" });
    },
    onError: (err: Error) => toast({ title: "Archive failed", description: err.message, variant: "destructive" }),
  });
};

/* ── Teams ── */

export const useDeleteHelpdeskTeam = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await db().from("helpdesk_teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "teams"] });
      toast({ title: "Team deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
};

export const useUpdateHelpdeskTeam = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; name?: string; assignment_mode?: string; visibility?: string }) => {
      const { error } = await db().from("helpdesk_teams").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "teams"] });
      toast({ title: "Team updated" });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });
};

/* ── SLA Policies ── */

export const useDeleteHelpdeskSlaPolicy = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (policyId: string) => {
      const { error } = await db().from("helpdesk_sla_policies").delete().eq("id", policyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "sla-policies"] });
      toast({ title: "SLA policy deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
};

export const useUpdateHelpdeskSlaPolicy = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; name?: string; target_hours?: number; priority_filter?: number | null; team_id?: string; target_stage_id?: string }) => {
      const { error } = await db().from("helpdesk_sla_policies").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "sla-policies"] });
      toast({ title: "SLA policy updated" });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });
};

/* ── Stages ── */

export const useCreateHelpdeskStage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (fields: { name: string; sequence: number; is_closed?: boolean; is_folded?: boolean }) => {
      const { error } = await db().from("helpdesk_ticket_stages").insert(fields);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "stages"] });
      toast({ title: "Stage created" });
    },
    onError: (err: Error) => toast({ title: "Create failed", description: err.message, variant: "destructive" }),
  });
};

export const useUpdateHelpdeskStage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; name?: string; sequence?: number; is_closed?: boolean; is_folded?: boolean }) => {
      const { error } = await db().from("helpdesk_ticket_stages").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "stages"] });
      toast({ title: "Stage updated" });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });
};

export const useDeleteHelpdeskStage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await db().from("helpdesk_ticket_stages").delete().eq("id", stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "stages"] });
      toast({ title: "Stage deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
};

/* ── Ticket Types ── */

export const useCreateHelpdeskTicketType = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (fields: { name: string }) => {
      const { error } = await db().from("helpdesk_ticket_types").insert(fields);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "ticket-types"] });
      toast({ title: "Ticket type created" });
    },
    onError: (err: Error) => toast({ title: "Create failed", description: err.message, variant: "destructive" }),
  });
};

export const useUpdateHelpdeskTicketType = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; name?: string; is_active?: boolean }) => {
      const { error } = await db().from("helpdesk_ticket_types").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "ticket-types"] });
      toast({ title: "Ticket type updated" });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });
};

export const useDeleteHelpdeskTicketType = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (typeId: string) => {
      const { error } = await db().from("helpdesk_ticket_types").delete().eq("id", typeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "ticket-types"] });
      toast({ title: "Ticket type deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
};

/* ── Ticket Tags ── */

export const useCreateHelpdeskTicketTag = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (fields: { name: string; color?: string }) => {
      const { error } = await db().from("helpdesk_ticket_tags").insert(fields);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "ticket-tags"] });
      toast({ title: "Tag created" });
    },
    onError: (err: Error) => toast({ title: "Create failed", description: err.message, variant: "destructive" }),
  });
};

export const useDeleteHelpdeskTicketTag = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await db().from("helpdesk_ticket_tags").delete().eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "ticket-tags"] });
      toast({ title: "Tag deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
};

/* ── Priorities ── */

export const useCreateHelpdeskPriority = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (fields: { level: number; label: string; color?: string }) => {
      const { error } = await db().from("helpdesk_priorities").insert(fields);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "priorities"] });
      toast({ title: "Priority created" });
    },
    onError: (err: Error) => toast({ title: "Create failed", description: err.message, variant: "destructive" }),
  });
};

export const useUpdateHelpdeskPriority = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; label?: string; color?: string; is_active?: boolean }) => {
      const { error } = await db().from("helpdesk_priorities").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "priorities"] });
      toast({ title: "Priority updated" });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });
};

export const useDeleteHelpdeskPriority = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (priorityId: string) => {
      const { error } = await db().from("helpdesk_priorities").delete().eq("id", priorityId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "priorities"] });
      toast({ title: "Priority deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
};
