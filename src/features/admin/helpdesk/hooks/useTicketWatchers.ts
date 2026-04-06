import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface HelpdeskTicketWatcher {
  id: string;
  ticket_id: string;
  watcher_type: "internal_user" | "non_user_staff" | "external_contact";
  user_id: string | null;
  staff_name: string | null;
  staff_email: string | null;
  contact_email: string | null;
  contact_name: string | null;
  is_permanent: boolean;
  created_at: string;
}

export type AddWatcherParams =
  | { ticketId: string; watcher_type: "internal_user"; user_id: string; is_permanent?: boolean }
  | { ticketId: string; watcher_type: "non_user_staff"; staff_name: string; staff_email: string; is_permanent?: boolean }
  | { ticketId: string; watcher_type: "external_contact"; contact_email: string; contact_name?: string; is_permanent?: boolean };

const watcherQueryKeys = {
  list: (ticketId: string) => ["helpdesk-ticket-watchers", ticketId] as const,
};

export const useTicketWatchers = (ticketId: string | undefined) => {
  return useQuery({
    queryKey: watcherQueryKeys.list(ticketId ?? ""),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_watchers")
        .select("id,ticket_id,watcher_type,user_id,staff_name,staff_email,contact_email,contact_name,is_permanent,created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as HelpdeskTicketWatcher[];
    },
  });
};

export const useAddTicketWatcher = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: AddWatcherParams) => {
      const row: Record<string, unknown> = {
        ticket_id: params.ticketId,
        watcher_type: params.watcher_type,
        is_permanent: params.is_permanent ?? false,
      };

      if (params.watcher_type === "internal_user") {
        row.user_id = params.user_id;
      } else if (params.watcher_type === "non_user_staff") {
        row.staff_name = params.staff_name;
        row.staff_email = params.staff_email;
      } else {
        row.contact_email = params.contact_email;
        row.contact_name = (params as { contact_name?: string }).contact_name ?? null;
      }

      const { error } = await (supabase as any)
        .from("helpdesk_ticket_watchers")
        .insert(row);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: watcherQueryKeys.list(variables.ticketId) });
      toast({ title: "Watcher added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add watcher", description: err.message, variant: "destructive" });
    },
  });
};

export const useRemoveTicketWatcher = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ watcherId, ticketId }: { watcherId: string; ticketId: string }) => {
      const { error } = await (supabase as any)
        .from("helpdesk_ticket_watchers")
        .delete()
        .eq("id", watcherId);

      if (error) throw error;
      return { ticketId };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: watcherQueryKeys.list(variables.ticketId) });
      toast({ title: "Watcher removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove watcher", description: err.message, variant: "destructive" });
    },
  });
};
