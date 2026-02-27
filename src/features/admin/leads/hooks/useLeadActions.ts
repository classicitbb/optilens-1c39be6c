import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";
import { DEFAULT_SEQUENCE } from "./useLeadSequenceBuilder";

export const useSaveLeadToCrm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadRecord) => {
      const contactPayload = {
        name: lead.name,
        country: lead.country,
        city: lead.city,
        website: lead.website,
        instagram_handle: lead.instagram_handle,
        facebook_page: lead.facebook_page,
        google_rating: lead.google_rating,
        google_reviews_count: lead.google_reviews_count,
        ai_intent_score: lead.ai_intent_score,
        status: "lead",
        notes: lead.notes,
      };

      const { data: contact, error: contactErr } = await supabase
        .from("contacts")
        .upsert(contactPayload as any, { onConflict: "name" })
        .select("id")
        .single();
      if (contactErr) throw contactErr;

      const { error: oppErr } = await supabase
        .from("opportunities" as any)
        .upsert({
          contact_id: contact.id,
          title: `${lead.name} Opportunity`,
          stage: "new",
          country: lead.country,
          volume_tier: "medium",
        } as any, { onConflict: "contact_id,title" });
      if (oppErr) throw oppErr;

      const { error: noteErr } = await supabase
        .from("notes" as any)
        .insert({
          contact_id: contact.id,
          source: "lead_finder",
          content: `Lead imported via Lead Finder. Score: ${lead.score}`,
        } as any);
      if (noteErr) throw noteErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads-v1"] });
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
    },
  });
};

export const useRunLeadSequence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      if (contactIds.length === 0) return;

      const now = Date.now();
      for (const contactId of contactIds) {
        for (const step of DEFAULT_SEQUENCE) {
          const dueAt = new Date(now + step.delayHours * 60 * 60 * 1000).toISOString();
          const { error: activityErr } = await supabase
            .from("activities" as any)
            .insert({
              contact_id: contactId,
              activity_type: `Sequence step ${step.step}: ${step.channel}`,
              status: "open",
              due_at: dueAt,
              payload: { prompt: step.prompt, channel: step.channel, sequence: "default-5-step" },
            } as any);
          if (activityErr) throw activityErr;
        }

        const { error: noteErr } = await supabase
          .from("notes" as any)
          .insert({
            contact_id: contactId,
            source: "sequence_runner",
            content: "5-step outreach sequence queued.",
          } as any);
        if (noteErr) throw noteErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
    },
  });
};

export const useGenerateLeadAuditReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ opportunityId, score = 70 }: { opportunityId: string; score?: number }) => {
      const { data: opp, error: oppErr } = await supabase
        .from("opportunities" as any)
        .select("id,contact_id,title")
        .eq("id", opportunityId)
        .single();
      if (oppErr) throw oppErr;

      const generatedAt = new Date().toISOString();
      const { data: audit, error: auditErr } = await supabase
        .from("lead_audits" as any)
        .insert({
          contact_id: opp.contact_id,
          opportunity_id: opp.id,
          score,
          score_breakdown: { volume: 15, website: 15, social: 15, supplier: 10, fit: 15, ai_boost: score - 70 },
          raw_data: { generated_at: generatedAt, source: "audit_reports_page" },
          ai_summary: `Audit generated for ${opp.title}.`,
        } as any)
        .select("id,score,ai_summary,created_at")
        .single();
      if (auditErr) throw auditErr;

      const { error: attachErr } = await supabase
        .from("opportunity_attachments" as any)
        .insert({
          opportunity_id: opp.id,
          attachment_type: "audit_report",
          payload: {
            audit_id: audit.id,
            score: audit.score,
            summary: audit.ai_summary,
            generated_at: audit.created_at,
          },
        } as any);
      if (attachErr) throw attachErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
    },
  });
};
