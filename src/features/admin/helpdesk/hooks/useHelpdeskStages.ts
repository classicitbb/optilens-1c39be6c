import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HelpdeskStage {
  id: string;
  name: string;
  is_closed: boolean;
  is_folded: boolean;
  sequence: number;
  team_id: string | null;
}

export const useHelpdeskStages = (teamId?: string) => {
  return useQuery({
    queryKey: ["helpdesk-stages", teamId ?? "all"],
    queryFn: async () => {
      let query = (supabase as any)
        .from("helpdesk_ticket_stages")
        .select("id,name,is_closed,is_folded,sequence,team_id")
        .order("sequence", { ascending: true });

      if (teamId) {
        query = query.or(`team_id.eq.${teamId},team_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as HelpdeskStage[];
    },
  });
};
