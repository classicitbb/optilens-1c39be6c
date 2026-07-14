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

/** Turn one cadence step into work: an AI draft (email/whatsapp) or a task (call/visit). */
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
      status: "open",
      due_at: due.toISOString(),
      payload: { channel: step.channel, enrollment_id: enrollmentId },
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
 * Scheduler-lite: process every active enrolment whose next step is due, drafting
 * or tasking it and advancing the enrolment. Run from the outbox on demand (the
 * operator opens it daily) until a cron replaces it.
 */
export const useGenerateDueSteps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: due, error } = await (supabase.from("cadence_enrollments") as any)
        .select("id,contact_id,cadence_id,current_step,enrolled_at")
        .eq("status", "active")
        .not("next_step_due_at", "is", null)
        .lte("next_step_due_at", nowIso);
      if (error) throw error;

      let processed = 0;
      for (const e of (due ?? []) as any[]) {
        const steps = await fetchSteps(e.cadence_id);
        const nextIndex = e.current_step; // current_step is 1-based count already done
        const nextStep = steps[nextIndex];
        if (!nextStep) {
          await (supabase.from("cadence_enrollments") as any)
            .update({ status: "completed", next_step_due_at: null, completed_at: nowIso })
            .eq("id", e.id);
          continue;
        }
        await materializeStep(e.contact_id, e.id, nextStep);
        const following = steps[nextIndex + 1];
        const enrolledAt = new Date(e.enrolled_at).getTime();
        const nextDue = following ? new Date(enrolledAt + following.delay_days * 86400000).toISOString() : null;
        await (supabase.from("cadence_enrollments") as any)
          .update({
            current_step: e.current_step + 1,
            next_step_due_at: nextDue,
            status: following ? "active" : "completed",
            completed_at: following ? null : nowIso,
          })
          .eq("id", e.id);
        processed++;
      }
      return processed;
    },
    onSuccess: () => invalidate(qc),
  });
};

export const useOutbox = (status?: OutboxDraft["status"]) =>
  useQuery({
    queryKey: ["outreach-outbox", status ?? "all"],
    queryFn: async () => {
      let q = (supabase.from("outreach_outbox") as any)
        .select("id,contact_id,enrollment_id,channel,subject,body,status,generated_by,created_at,sent_at")
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
