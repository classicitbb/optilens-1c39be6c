import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";

interface FinderConstraints {
  productCategories?: string[];
  marginTiers?: string[];
  fulfillmentGeography?: string;
  existingCustomerProfile?: string;
  exclusions?: string[];
  maxIntents?: number;
}

interface FinderInput {
  query?: string;
  country?: string;
  cities?: string[];
  globalSearch?: boolean;
  mode: "manual" | "autopilot";
  constraints?: FinderConstraints;
}

export interface LeadFinderDiagnostics {
  mode: "manual" | "autopilot";
  scopeMode: "global" | "country_city";
  searchRunId: string | null;
  planner: {
    mode: "manual" | "autopilot";
    rankedIntents: Array<{
      rank: number;
      score: number;
      strategyId: string;
      searchIntent: string;
      query: string;
      industry: string;
      channelHints: string[];
      rationale: string[];
      whySuggested: string[];
      historicalPerformance: {
        sampleSize: number;
        winRate: number;
        avgDealSize: number | null;
        cacProxy: number | null;
      } | null;
    }>;
    selectedIntent: {
      rank: number;
      score: number;
      strategyId: string;
      searchIntent: string;
      query: string;
      industry: string;
      channelHints: string[];
      rationale: string[];
      whySuggested: string[];
      historicalPerformance: {
        sampleSize: number;
        winRate: number;
        avgDealSize: number | null;
        cacProxy: number | null;
      } | null;
    } | null;
  };
  providerStatus: {
    googlePlacesConfigured: boolean;
    facebookGraphConfigured: boolean;
    instagramGraphConfigured: boolean;
    whatsappBusinessSignalsConfigured: boolean;
    yellowPagesConfigured: boolean;
    bingConfigured: boolean;
    yahooConfigured: boolean;
  };
  providersUsed: string[];
  providerTelemetry: Record<string, {
    attempted: boolean;
    resultCount: number;
    latencyMs: number;
    errorCode: string | null;
  }>;
  emptyReason: "no_providers_configured" | "provider_failures" | "no_matches" | null;
  queryEcho: {
    query: string;
    country?: string;
    city?: string;
  };
  fetchedAt: string;
}

export interface LeadFinderResult {
  leads: LeadRecord[];
  diagnostics: LeadFinderDiagnostics | null;
  warning?: string | null;
}

interface ComplianceErrorPayload {
  error?: string;
  compliant_alternatives?: string[];
  blocked_category?: string;
}

export const useLeadFinder = () => {
  return useMutation({
    mutationFn: async ({ query, country, cities, globalSearch, mode, constraints }: FinderInput): Promise<LeadFinderResult> => {
      const { data, error } = await supabase.functions.invoke("lead-intelligence", {
        body: { query, country, cities, globalSearch: !!globalSearch, includeDiagnostics: true, mode, constraints },
      });

      if (error) {
        const message = `${error.message ?? ""}`;
        const unavailable = message.includes("Failed to send a request to the Edge Function") || message.includes("FunctionsFetchError") || message.includes("404");
        if (!unavailable) throw error;
        return {
          leads: [],
          diagnostics: {
            mode: globalSearch ? "global" : "country_city",
            providerStatus: {
              googlePlacesConfigured: false,
              facebookGraphConfigured: false,
              instagramGraphConfigured: false,
              yellowPagesConfigured: false,
            },
            providersUsed: [],
            queryEcho: { query, country, city: cities?.[0] },
            fetchedAt: new Date().toISOString(),
          },
          warning: "Live provider search is temporarily unavailable. Confirm Edge Function deployment and provider keys.",
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
        ai_intent_score: null,
        status: "lead",
        score: Number(lead.score ?? 0),
        notes: null,
        search_run_id: lead.search_run_id ?? diagnostics?.searchRunId ?? null,
      })) as LeadRecord[];
      return {
        leads,
        diagnostics: (data?.diagnostics ?? null) as LeadFinderDiagnostics | null,
        warning: null,
      };
    },
  });
};
