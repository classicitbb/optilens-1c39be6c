import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared pipeline vocabulary. Stage lives on the contact (see
 * docs/CRM_BUILD_PLAN.md); `pipeline` is the market motion and `stage` is the
 * position in the shared 9-stage journey plus the parallel nurture lane.
 */
export const PIPELINE_STAGES = [
  { key: "target", title: "Target", hint: "Identified, not yet contacted" },
  { key: "outreach", title: "Outreach", hint: "First contact made, awaiting response" },
  { key: "engaged", title: "Engaged", hint: "They have responded" },
  { key: "qualifying", title: "Qualifying", hint: "Learning their business and gaps" },
  { key: "presenting", title: "Presenting", hint: "Making the tailored case" },
  { key: "trial_offer", title: "Trial Offer", hint: "Proposing a low-risk test shipment" },
  { key: "trial_active", title: "Trial Active", hint: "First order placed — care intensively" },
  { key: "converting", title: "Converting", hint: "Ordering regularly, growing share" },
  { key: "customer", title: "Customer", hint: "Won — retain and grow" },
] as const;

export const NURTURE_STAGE = { key: "nurture", title: "Nurture", hint: "Not now — warm long-game lure" } as const;

export const ALL_STAGES = [...PIPELINE_STAGES, NURTURE_STAGE] as const;

export type PipelineStageKey = (typeof ALL_STAGES)[number]["key"];

export const CRM_PIPELINES = [
  { key: "opticals", label: "Opticals" },
  { key: "department_stores", label: "Department Stores" },
  { key: "labs", label: "Labs" },
] as const;

export type PipelineKey = (typeof CRM_PIPELINES)[number]["key"];

export const stageTitle = (key: string | null): string =>
  ALL_STAGES.find((s) => s.key === key)?.title ?? "—";

export interface PipelineContact {
  id: string;
  name: string;
  business_name: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  pipeline: string | null;
  stage: string | null;
  stage_entered_at: string | null;
  next_action_at: string | null;
  lead_score: number;
  is_company: boolean;
  google_place_id: string | null;
}

const CONTACT_COLUMNS =
  "id,name,business_name,city,country,website,pipeline,stage,stage_entered_at,next_action_at,lead_score,is_company,google_place_id";

/** Contacts already in a pipeline (any stage), for the board. */
export const usePipelineContacts = (pipeline: PipelineKey) =>
  useQuery({
    queryKey: ["pipeline-contacts", pipeline],
    queryFn: async () => {
      const { data, error } = await (supabase.from("contacts") as any)
        .select(CONTACT_COLUMNS)
        .eq("pipeline", pipeline)
        .eq("is_archived", false)
        .order("stage_entered_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as PipelineContact[];
    },
  });

/**
 * Business-like contacts not yet in any pipeline — the curation pool. Prioritise
 * companies / mapped businesses with the strongest lead signal first.
 */
export const useUnclassifiedContacts = () =>
  useQuery({
    queryKey: ["unclassified-contacts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("contacts") as any)
        .select(CONTACT_COLUMNS)
        .is("pipeline", null)
        .eq("is_archived", false)
        .or("is_company.eq.true,google_place_id.not.is.null")
        .order("lead_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as PipelineContact[];
    },
  });

const invalidatePipeline = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["pipeline-contacts"] });
  qc.invalidateQueries({ queryKey: ["unclassified-contacts"] });
  qc.invalidateQueries({ queryKey: ["contacts"] });
};

/** Move a contact to a different stage within its pipeline. */
export const useSetContactStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: PipelineStageKey }) => {
      const { error } = await (supabase.from("contacts") as any)
        .update({ stage, stage_entered_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidatePipeline(qc),
  });
};

/** Bring an unclassified contact into a pipeline at a chosen stage. */
export const useClassifyContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pipeline, stage }: { id: string; pipeline: PipelineKey; stage: PipelineStageKey }) => {
      const { error } = await (supabase.from("contacts") as any)
        .update({ pipeline, stage, stage_entered_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidatePipeline(qc),
  });
};

/** Remove a contact from the pipeline entirely (back to a plain contact). */
export const useRemoveFromPipeline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("contacts") as any)
        .update({ pipeline: null, stage: null, next_action_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidatePipeline(qc),
  });
};
