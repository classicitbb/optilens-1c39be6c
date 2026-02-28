import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";

interface FinderInput {
  query: string;
  country?: string;
  cities?: string[];
  globalSearch?: boolean;
}

export interface LeadFinderDiagnostics {
  mode: "global" | "country_city";
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
}

interface ComplianceErrorPayload {
  error?: string;
  compliant_alternatives?: string[];
  blocked_category?: string;
}

export const useLeadFinder = () => {
  return useMutation({
    mutationFn: async ({ query, country, cities, globalSearch }: FinderInput): Promise<LeadFinderResult> => {
      const { data, error } = await supabase.functions.invoke("lead-intelligence", {
        body: { query, country, cities, globalSearch: !!globalSearch, includeDiagnostics: true },
      });
      if (error) {
        const payload = (data ?? {}) as ComplianceErrorPayload;
        const alternatives = Array.isArray(payload.compliant_alternatives)
          ? ` Alternatives: ${payload.compliant_alternatives.join(" ")}`
          : "";
        throw new Error(payload.error ? `${payload.error}${alternatives}` : error.message);
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
      })) as LeadRecord[];
      return {
        leads,
        diagnostics: (data?.diagnostics ?? null) as LeadFinderDiagnostics | null,
      };
    },
  });
};
