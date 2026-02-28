import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Opportunity } from "@/features/admin/crm/hooks/useOpportunities";

export interface FunnelStagePoint {
  stage: Opportunity["stage"];
  label: string;
  count: number;
}

const STAGE_LABELS: Record<Opportunity["stage"], string> = {
  new: "New",
  contacted: "Contacted",
  meeting_completed: "Meeting Completed",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const STAGE_ORDER: Opportunity["stage"][] = ["new", "contacted", "meeting_completed", "proposal", "won", "lost"];

export const useDashboardFunnel = () => {
  return useQuery({
    queryKey: ["admin-dashboard", "funnel"],
    queryFn: async (): Promise<FunnelStagePoint[]> => {
      const { data, error } = await supabase.from("opportunities").select("stage");
      if (error) throw error;

      const counts = new Map<Opportunity["stage"], number>();
      (data ?? []).forEach((item) => {
        const stage = item.stage as Opportunity["stage"];
        counts.set(stage, (counts.get(stage) ?? 0) + 1);
      });

      return STAGE_ORDER.map((stage) => ({
        stage,
        label: STAGE_LABELS[stage],
        count: counts.get(stage) ?? 0,
      }));
    },
  });
};
