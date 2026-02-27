import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Opportunity {
  id: string;
  title: string;
  stage: "new" | "contacted" | "meeting_completed" | "proposal" | "won" | "lost";
  country: string | null;
  volume_tier: string | null;
  estimated_value: number | null;
  contact_id: string;
  created_at: string;
}

export const useOpportunities = () => {
  return useQuery({
    queryKey: ["crm-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities" as any)
        .select("id,title,stage,country,volume_tier,estimated_value,contact_id,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });
};

export const useUpdateOpportunityStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Opportunity["stage"] }) => {
      const { error } = await supabase
        .from("opportunities" as any)
        .update({ stage, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-opportunities"] }),
  });
};
