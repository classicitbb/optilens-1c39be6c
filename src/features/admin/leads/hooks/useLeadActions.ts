import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";
import { DEFAULT_SEQUENCE } from "./useLeadSequenceBuilder";
import { formatComplianceError, validateTargetingInput } from "../utils/targetingCompliance";
import { inferLeadSegment } from "../utils/campaignActivation";

const logLeadEvent = async (payload: {
  event_type: "saved_to_crm" | "sequence_started" | "blocked_request";
  contact_id?: string | null;
  opportunity_id?: string | null;
  provider_diagnostics_summary?: Record<string, unknown>;
}) => {
  try {
    await supabase.from("lead_events" as any).insert({
      event_type: payload.event_type,
      contact_id: payload.contact_id ?? null,
      opportunity_id: payload.opportunity_id ?? null,
      provider_diagnostics_summary: payload.provider_diagnostics_summary ?? {},
    } as any);
  } catch {
    // silently ignore
  }
};

export const useSaveLeadToCrm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadRecord) => {
      const segment = inferLeadSegment(lead);

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
        lead_score: lead.score,
        lead_source: lead.lead_source ?? "lead_finder",
        lead_segment: lead.lead_segment ?? segment,
      };

      const { data: contact, error: contactErr } = await (supabase.from("contacts") as any)
        .upsert(contactPayload as any, { onConflict: "name" })
        .select("id")
        .single();
      if (contactErr) throw contactErr;

      const { data: oppRaw, error: oppErr } = await supabase
        .from("opportunities" as any)
        .upsert({
          contact_id: contact.id,
          title: `${lead.name} Opportunity`,
          stage: "new",
          country: lead.country,
          volume_tier: "medium",
          source_search_run_id: lead.search_run_id ?? null,
        } as any, { onConflict: "contact_id,title" })
        .select("id")
        .single();
      if (oppErr) throw oppErr;
      const opportunity = oppRaw as unknown as { id: string } | null;

      const { error: noteErr } = await supabase
        .from("notes" as any)
        .insert({
          contact_id: contact.id,
          source: "lead_finder",
          content: `Lead imported via Lead Finder. Score: ${lead.score}`,
        } as any);
      if (noteErr) throw noteErr;


      try {
        await supabase.from("lead_scoring_outcomes" as any).insert({
          contact_id: contact.id,
          opportunity_id: opportunity?.id ?? null,
          outcome_stage: "imported_to_crm",
          model_score: lead.score,
          score_breakdown: lead.lead_score_breakdown ?? {},
          metadata: {
            source: "lead_finder",
            lead_name: lead.name,
          },
        } as any);
      } catch {
        // silently ignore outcome logging failures
      }

      await logLeadEvent({
        event_type: "saved_to_crm",
        contact_id: contact.id,
        opportunity_id: opportunity?.id ?? null,
        provider_diagnostics_summary: {
          source: "lead_finder",
          lead_name: lead.name,
          score: lead.score,
          country: lead.country,
          city: lead.city,
          search_run_id: lead.search_run_id ?? null,
        },
      });
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

      for (const step of DEFAULT_SEQUENCE) {
        const compliance = validateTargetingInput(step.prompt);
        if (compliance.blocked) {
          await logLeadEvent({
            event_type: "blocked_request",
            provider_diagnostics_summary: {
              source: "sequence_runner",
              blocked_category: compliance.category,
              matched_term: compliance.matchedTerm,
              input: step.prompt,
            },
          });
          throw new Error(formatComplianceError("Campaign sequence generation", compliance));
        }
      }

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

        await logLeadEvent({
          event_type: "sequence_started",
          contact_id: contactId,
          provider_diagnostics_summary: {
            source: "sequence_runner",
            sequence_name: "default-5-step",
            steps_count: DEFAULT_SEQUENCE.length,
          },
        });
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
      const { data: oppRaw, error: oppErr } = await supabase
        .from("opportunities" as any)
        .select("id,contact_id,title")
        .eq("id", opportunityId)
        .single();
      if (oppErr) throw oppErr;
      const opp = oppRaw as unknown as { id: string; contact_id: string; title: string };

      const generatedAt = new Date().toISOString();
      const { data: auditRaw, error: auditErr } = await supabase
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
      const audit = auditRaw as unknown as { id: string; score: number; ai_summary: string; created_at: string };

      const { error: attachErr } = await supabase
        .from("opportunity_attachments" as any)
        .insert({
          opportunity_id: opp.id,
          attachment_type: "audit_report",
          payload: {
            audit_id: audit?.id,
            score: audit?.score,
            summary: audit?.ai_summary,
            generated_at: audit?.created_at,
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
