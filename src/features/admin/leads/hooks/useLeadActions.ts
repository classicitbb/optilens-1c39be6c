import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConnectionStrength, LeadFollowUp, LeadRecord } from "../types";
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
    await (supabase as any).from("lead_events").insert({
      event_type: payload.event_type,
      contact_id: payload.contact_id ?? null,
      opportunity_id: payload.opportunity_id ?? null,
      provider_diagnostics_summary: payload.provider_diagnostics_summary ?? {},
    } as any);
  } catch {
    // silently ignore
  }
};

export interface SaveLeadInput {
  lead: LeadRecord;
  /** Existing contact chosen by the operator; omit to use the confirmed link or create a new one. */
  contactId?: string | null;
  connectionStrength: ConnectionStrength;
  followUp: LeadFollowUp;
}

const hostOfWebsite = (website: string | null) => {
  if (!website) return null;
  try {
    return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

export const buildIdentityPayload = (lead: LeadRecord) => {
  if (!lead.identity_key || !lead.crm) throw new Error("This result has no business identity yet. Search again.");
  return {
    identity_key: lead.identity_key,
    display_name: lead.name,
    normalized_name: lead.crm.normalizedName,
    city: lead.city,
    country: lead.country,
    website: lead.website,
    website_host: hostOfWebsite(lead.website),
    formatted_address: lead.formatted_address ?? null,
  };
};

const invalidateCrm = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["leads-v1"] });
  qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
  qc.invalidateQueries({ queryKey: ["crm-activities"] });
};

/** Explicit, transactional save: one RPC, targeting the chosen contact or creating a new one. */
export const useSaveLeadToCrm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead, contactId, connectionStrength, followUp }: SaveLeadInput) => {
      if (lead.crm?.status === "unavailable") {
        throw new Error("CRM matching is unavailable, so saving could create a duplicate. Search again once it recovers.");
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).rpc("lead_finder_save_lead", {
        p_payload: {
          identity: buildIdentityPayload(lead),
          contact_id: contactId ?? lead.crm?.match?.contactId ?? null,
          lead: {
            rating: lead.google_rating,
            reviews: lead.google_reviews_count,
            instagram_handle: lead.instagram_handle,
            facebook_page: lead.facebook_page,
            score: lead.score,
            ai_intent_score: lead.ai_intent_score,
            score_breakdown: lead.lead_score_breakdown ?? {},
            search_run_id: lead.search_run_id ?? null,
            lead_segment: lead.lead_segment ?? inferLeadSegment(lead),
          },
          connection_strength: connectionStrength,
          needs_follow_up: followUp.needsFollowUp,
          follow_up_owner: followUp.needsFollowUp ? followUp.ownerId ?? user?.id ?? null : null,
          follow_up_due_at: followUp.needsFollowUp && followUp.dueDate ? new Date(`${followUp.dueDate}T12:00:00`).toISOString() : null,
        },
      });
      if (error) throw error;
      return data as { contact_id: string; created_contact: boolean; task_id: string | null; already_saved: boolean };
    },
    onSuccess: () => invalidateCrm(qc),
  });
};

export const useConfirmLeadLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead, contactId }: { lead: LeadRecord; contactId: string }) => {
      const { error } = await (supabase as any).rpc("lead_finder_confirm_link", {
        p_identity: buildIdentityPayload(lead),
        p_contact_id: contactId,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateCrm(qc),
  });
};

export const useMarkCurrentCustomer = () => {
  return useMutation({
    mutationFn: async (lead: LeadRecord) => {
      const { error } = await (supabase as any).rpc("lead_finder_mark_customer", {
        p_identity: buildIdentityPayload(lead),
      });
      if (error) throw error;
    },
  });
};

export const useClearLeadLink = () => {
  return useMutation({
    mutationFn: async (identityKey: string) => {
      const { error } = await (supabase as any).rpc("lead_finder_clear_link", { p_identity_key: identityKey });
      if (error) throw error;
    },
  });
};

export interface ContactSearchResult {
  id: string;
  name: string | null;
  business_name: string | null;
  city: string | null;
  is_customer: boolean | null;
  linked_customer_id: number | null;
}

/** Searchable contact picker source; names differing from the lead are expected. */
export const searchContacts = async (term: string): Promise<ContactSearchResult[]> => {
  const trimmed = term.trim().replace(/[%,()]/g, " ");
  if (trimmed.length < 2) return [];
  const { data, error } = await (supabase.from("contacts") as any)
    .select("id,name,business_name,city,is_customer,linked_customer_id")
    .or(`name.ilike.%${trimmed}%,business_name.ilike.%${trimmed}%`)
    .eq("is_archived", false)
    .order("name")
    .limit(15);
  if (error) throw error;
  return (data ?? []) as ContactSearchResult[];
};

export const useRunLeadSequence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      if (contactIds.length === 0) return;
      const { data: { user } } = await supabase.auth.getUser();

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
      // activities.type is constrained to whatsapp/email/call/note/meeting/quote;
      // sequence channels outside that set (e.g. instagram_dm) fall back to "note".
      const allowedActivityTypes = new Set(["whatsapp", "email", "call", "note", "meeting", "quote"]);
      for (const contactId of contactIds) {
        for (const step of DEFAULT_SEQUENCE) {
          const dueAt = new Date(now + step.delayHours * 60 * 60 * 1000).toISOString();
          const { error: activityErr } = await (supabase.from("activities") as any)
            .insert({
              contact_id: contactId,
              activity_type: `Sequence step ${step.step}: ${step.channel}`,
              status: "planned",
              owner_id: user?.id ?? null,
              due_at: dueAt,
              type: allowedActivityTypes.has(step.channel) ? step.channel : "note",
              content: `${step.prompt} (channel: ${step.channel}, sequence: default-5-step)`,
            } as any);
          if (activityErr) throw activityErr;
        }

        const { error: noteErr } = await (supabase.from("notes") as any)
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
      const { data: oppRaw, error: oppErr } = await (supabase.from("opportunities") as any)
        .select("id,contact_id,title")
        .eq("id", opportunityId)
        .single();
      if (oppErr) throw oppErr;
      const opp = oppRaw as unknown as { id: string; contact_id: string; title: string };

      const generatedAt = new Date().toISOString();
      const { data: auditRaw, error: auditErr } = await (supabase.from("lead_audits") as any)
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

      const { error: attachErr } = await (supabase as any).from("opportunity_attachments")
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
