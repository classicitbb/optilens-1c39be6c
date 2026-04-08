import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HelpdeskStage {
  id: string;
  name: string;
  is_closed: boolean;
  is_folded: boolean;
  sequence: number;
}

/**
 * Fetches all helpdesk ticket stages ordered by sequence.
 * Note: the active schema uses tenant_key (not team_id), so no team filter is applied.
 */
export const useHelpdeskStages = () => {
  return useQuery({
    queryKey: ["helpdesk-stages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_stages")
        .select("id,name,is_closed,is_folded,sequence")
        .order("sequence", { ascending: true });

      if (error) throw error;
      return (data ?? []) as HelpdeskStage[];
    },
  });
};
