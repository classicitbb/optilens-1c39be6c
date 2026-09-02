import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IDEAL_CUSTOMER_PROFILE } from "@/config/idealCustomerProfile";
import type { LeadRecord } from "../types";

interface FinderInput {
  /** What the operator typed, in their own words. */
  brief: string;
  limit?: number;
}

export interface LeadFinderPlan {
  interpretation: string;
  businessTypes: string[];
  locations: Array<{ city: string | null; country: string | null }>;
  searchQueries: string[];
  mustHave: string[];
  exclude: string[];
  aiPlanned: boolean;
}

export interface LeadFinderDiagnostics {
  pipeline: "brief" | "lookup";
  brief: string;
  plan: LeadFinderPlan;
  aiStatus: {
    plannerUsed: boolean;
    qualifierUsed: boolean;
    error: string | null;
  };
  providerStatus: {
    googlePlacesConfigured: boolean;
    firecrawlSearchConfigured: boolean;
    aiConfigured: boolean;
  };
  providersUsed: string[];
  providerTelemetry: Record<string, {
    attempted: boolean;
    resultCount: number;
    latencyMs: number;
    errorCode: string | null;
  }>;
  candidatesFound: number;
  qualifiedCount: number;
  rejected: Array<{ name: string; reason: string }>;
  emptyReason: "no_providers_configured" | "provider_failures" | "no_matches" | "no_qualified_matches" | null;
  searchRunId: string | null;
  fetchedAt: string;
}

export interface LeadFinderResult {
  leads: LeadRecord[];
  diagnostics: LeadFinderDiagnostics | null;
  warning?: string | null;
}

/** Background context for the planner: who we sell to, in one paragraph. */
const ICP_SUMMARY = [
  IDEAL_CUSTOMER_PROFILE.description,
  `Typical buyers: ${IDEAL_CUSTOMER_PROFILE.firmographics.roles.join(", ")}.`,
  `Products: ${IDEAL_CUSTOMER_PROFILE.productCategories.join(", ")}.`,
  `Core markets: ${IDEAL_CUSTOMER_PROFILE.geography.primaryCountries.join("; ")}.`,
].join(" ");

export const useLeadFinder = () => {
  return useMutation({
    mutationFn: async ({ brief, limit }: FinderInput): Promise<LeadFinderResult> => {
      const { data, error } = await supabase.functions.invoke("lead-intelligence", {
        body: { brief, limit, includeDiagnostics: true, icpSummary: ICP_SUMMARY },
      });

      if (error) {
        const message = `${error.message ?? ""}`;
        const unavailable = message.includes("Failed to send a request to the Edge Function") ||
          message.includes("FunctionsFetchError") ||
          message.includes("404");
        if (!unavailable) throw error;
        return {
          leads: [],
          diagnostics: null,
          warning:
            "Live lead search is temporarily unavailable. Confirm the lead-intelligence function is deployed and provider credentials are set in /admin/leads/settings.",
        };
      }

      const leads = ((data?.leads ?? []) as any[]).map((lead) => ({
        id: lead.id ?? crypto.randomUUID(),
        name: lead.name,
        city: lead.city ?? null,
        country: lead.country ?? null,
        website: lead.website ?? null,
        instagram_handle: lead.instagram_handle ?? null,
        facebook_page: lead.facebook_page ?? null,
        google_rating: lead.google_rating ?? null,
        google_reviews_count: lead.google_reviews_count ?? null,
        ai_intent_score: typeof lead.fit_score === "number" ? lead.fit_score : null,
        status: "lead",
        score: Number(lead.score ?? 0),
        lead_score_breakdown: lead.lead_score_breakdown ?? null,
        fit_reason: lead.fit_reason ?? null,
        source_provider: lead.source_provider ?? null,
        formatted_address: lead.formatted_address ?? null,
        notes: null,
        search_run_id: lead.search_run_id ?? data?.diagnostics?.searchRunId ?? null,
      })) as LeadRecord[];

      return {
        leads,
        diagnostics: (data?.diagnostics ?? null) as LeadFinderDiagnostics | null,
        warning: null,
      };
    },
  });
};
