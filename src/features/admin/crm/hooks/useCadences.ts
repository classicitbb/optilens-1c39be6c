import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineKey } from "./usePipeline";

export interface Cadence {
  id: string;
  name: string;
  pipeline: string;
  target_stage: string | null;
  description: string | null;
  is_active: boolean;
}

export interface CadenceStep {
  id: string;
  cadence_id: string;
  step_order: number;
  channel: "email" | "whatsapp" | "call" | "visit";
  delay_days: number;
  subject: string | null;
  body_template: string | null;
}

export interface OutboxDraft {
  id: string;
  contact_id: string;
  enrollment_id: string | null;
  channel: "email" | "whatsapp";
  subject: string | null;
  body: string | null;
  status: "draft" | "approved" | "sent" | "rejected" | "failed";
  generated_by: string;
  created_at: string;
  sent_at: string | null;
  approved_at?: string | null;
  auto_send?: boolean;
}

export const useCadences = (pipeline: PipelineKey) =>
  useQuery({
    queryKey: ["cadences", pipeline],
    queryFn: async () => {
      const { data, error } = await (supabase.from("cadences") as any)
        .select("id,name,pipeline,target_stage,description,is_active")
        .eq("pipeline", pipeline)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Cadence[];
    },
  });

const fetchSteps = async (cadenceId: string): Promise<CadenceStep[]> => {
  const { data, error } = await (supabase.from("cadence_steps") as any)
    .select("id,cadence_id,step_order,channel,delay_days,subject,body_template")
    .eq("cadence_id", cadenceId)
    .order("step_order");
  if (error) throw error;
  return (data ?? []) as CadenceStep[];
};

/** Turn the first cadence step into work: an AI draft (email/whatsapp) or a task (call/visit). */
const materializeStep = async (contactId: string, enrollmentId: string, step: CadenceStep) => {
  if (step.channel === "email" || step.channel === "whatsapp") {
    const { error } = await supabase.functions.invoke("crm-draft-outreach", {
      body: { contact_id: contactId, step_id: step.id, enrollment_id: enrollmentId },
    });
    if (error) throw error;
  } else {
    const due = new Date();
    const { error } = await (supabase.from("activities") as any).insert({
      activity_type: `${step.channel === "call" ? "Call" : "Visit"} — cadence step ${step.step_order}`,
      contact_id: contactId,
      status: "planned",
      owner_id: (await supabase.auth.getUser()).data.user?.id ?? null,
      due_at: due.toISOString(),
      type: step.channel === "call" ? "call" : "meeting",
      content: `Cadence enrollment ${enrollmentId}, channel: ${step.channel}.`,
    });
    if (error) throw error;
  }
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["outreach-outbox"] });
  qc.invalidateQueries({ queryKey: ["cadence-enrollments"] });
  qc.invalidateQueries({ queryKey: ["crm-activities"] });
};

/** Enrol a contact in a cadence and immediately materialise step 1. */
export const useEnrollContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, cadenceId }: { contactId: string; cadenceId: string }) => {
      const steps = await fetchSteps(cadenceId);
      if (steps.length === 0) throw new Error("Cadence has no steps");

      const now = new Date();
      const second = steps[1];
      const nextDue = second ? new Date(now.getTime() + second.delay_days * 86400000).toISOString() : null;

      const { data: enrollment, error } = await (supabase.from("cadence_enrollments") as any)
        .insert({
          contact_id: contactId,
          cadence_id: cadenceId,
          status: "active",
          current_step: 1,
          next_step_due_at: nextDue,
          enrolled_at: now.toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      await materializeStep(contactId, (enrollment as any).id, steps[0]);
    },
    onSuccess: () => invalidate(qc),
  });
};

/**
 * Runs the server-side cadence runner now (it also runs on a 15-minute schedule):
 * prepares due steps as drafts/tasks and sends drafts approved for automatic
 * sending. Returns how many steps were prepared.
 */
export const useGenerateDueSteps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("crm-cadence-runner", { body: {} });
      if (error) throw error;
      return Number((data as { stepsPrepared?: number } | null)?.stepsPrepared ?? 0);
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useOutbox = (status?: OutboxDraft["status"]) =>
  useQuery({
    queryKey: ["outreach-outbox", status ?? "all"],
    queryFn: async () => {
      let q = (supabase.from("outreach_outbox") as any)
        .select("id,contact_id,enrollment_id,channel,subject,body,status,generated_by,created_at,sent_at,auto_send,error")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OutboxDraft[];
    },
  });

export const useUpdateOutbox = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OutboxDraft> }) => {
      const { error } = await (supabase.from("outreach_outbox") as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach-outbox"] }),
  });
};
