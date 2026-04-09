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

interface CreateOpportunityInput {
  contactName: string;
  opportunityTitle: string;
  country?: string;
  city?: string;
  state?: string;
  stage?: Opportunity["stage"];
  volumeTier?: string;
  estimatedValue?: number;
}

const SAMPLE_OPPORTUNITIES: CreateOpportunityInput[] = [
  {
    contactName: "Bright Vision Optical - Kingston",
    opportunityTitle: "Kingston AR Bundle Expansion",
    country: "Jamaica",
    city: "Kingston",
    stage: "new",
    volumeTier: "high",
    estimatedValue: 12500,
  },
  {
    contactName: "Island Eye Centre - Port of Spain",
    opportunityTitle: "Premium Progressive Pilot",
    country: "Trinidad & Tobago",
    city: "Port of Spain",
    stage: "contacted",
    volumeTier: "medium",
    estimatedValue: 9800,
  },
  {
    contactName: "Caribe Optical Studio - Bridgetown",
    opportunityTitle: "Fast-Turn SV Stock Program",
    country: "Barbados",
    city: "Bridgetown",
    stage: "proposal",
    volumeTier: "medium",
    estimatedValue: 14300,
  },
];

const upsertOpportunity = async (input: CreateOpportunityInput) => {
  const contactPayload = {
    name: input.contactName,
    country: input.country ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    status: "lead",
  };

  const { data: contact, error: contactErr } = await (supabase.from("contacts") as any)
    .upsert(contactPayload as any, { onConflict: "name" })
    .select("id")
    .single();

  if (contactErr) throw contactErr;

  const opportunityPayload = {
    contact_id: contact.id,
    title: input.opportunityTitle,
    stage: input.stage ?? "new",
    country: input.country ?? null,
    volume_tier: input.volumeTier ?? "medium",
    estimated_value: input.estimatedValue ?? null,
  };

  const { error: oppErr } = await supabase
    .from("opportunities") as any)
    .upsert(opportunityPayload as any, { onConflict: "contact_id,title" });

  if (oppErr) throw oppErr;
};

const stageTaskMap: Record<Opportunity["stage"], string> = {
  new: "Initial outreach",
  contacted: "Book discovery call",
  meeting_completed: "Send proposal summary",
  proposal: "Proposal follow-up",
  won: "Onboarding handoff",
  lost: "Loss review",
};

const toLifecycleStage = (stage: Opportunity["stage"]): "contacted" | "meeting" | "proposal" | "won" | "lost" | null => {
  if (stage === "contacted") return "contacted";
  if (stage === "meeting_completed") return "meeting";
  if (stage === "proposal") return "proposal";
  if (stage === "won") return "won";
  if (stage === "lost") return "lost";
  return null;
};

export const useOpportunities = () => {
  return useQuery({
    queryKey: ["crm-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities") as any)
        .select("id,title,stage,country,volume_tier,estimated_value,contact_id,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Opportunity[];
    },
  });
};

export const useUpdateOpportunityStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Opportunity["stage"] }) => {
      const { data: oppRaw, error: oppGetErr } = await supabase
        .from("opportunities") as any)
        .select("id,contact_id,title,estimated_value,source_search_run_id")
        .eq("id", id)
        .single();
      if (oppGetErr) throw oppGetErr;
      const opp = oppRaw as unknown as {
        id: string;
        contact_id: string;
        title: string;
        estimated_value: number | null;
        source_search_run_id: string | null;
      };

      const { error } = await supabase
        .from("opportunities") as any)
        .update({ stage, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;

      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 2);
      const { error: activityErr } = await supabase
        .from("activities") as any)
        .insert({
          opportunity_id: id,
          contact_id: opp.contact_id,
          activity_type: stageTaskMap[stage],
          status: "open",
          due_at: dueAt.toISOString(),
          payload: { stage, source: "stage_transition", opportunityTitle: opp.title },
        } as any);
      if (activityErr) throw activityErr;

      const lifecycleStage = toLifecycleStage(stage);
      if (lifecycleStage) {
        const { error: outcomeErr } = await supabase
          .from("lead_search_outcomes") as any)
          .upsert({
            opportunity_id: id,
            contact_id: opp.contact_id,
            lead_search_run_id: opp.source_search_run_id,
            lifecycle_stage: lifecycleStage,
            is_won: stage === "won" ? true : stage === "lost" ? false : null,
            deal_size: stage === "won" ? opp.estimated_value : null,
            metadata: { stage, source: "crm_pipeline" },
            recorded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "opportunity_id" });
        if (outcomeErr) throw outcomeErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
    },
  });
};

export const useCreateOpportunity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOpportunityInput) => {
      await upsertOpportunity(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
      qc.invalidateQueries({ queryKey: ["leads-v1"] });
    },
  });
};

export const useSeedSampleOpportunities = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      for (const sample of SAMPLE_OPPORTUNITIES) {
        await upsertOpportunity(sample);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
      qc.invalidateQueries({ queryKey: ["leads-v1"] });
    },
  });
};
