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

export const useLeadFinder = () => {
  return useMutation({
    mutationFn: async ({ query, country, cities, globalSearch }: FinderInput): Promise<LeadFinderResult> => {
      const { data, error } = await supabase.functions.invoke("lead-intelligence", {
        body: { query, country, cities, globalSearch: !!globalSearch, includeDiagnostics: true },
      });
      if (error) throw error;
      const rawLeads = (data?.leads ?? []) as Array<Record<string, unknown>>;
      const leads = rawLeads.map((lead) => ({
        id: typeof lead.id === "string" ? lead.id : crypto.randomUUID(),
        name: typeof lead.name === "string" ? lead.name : "Unknown",
        city: typeof lead.city === "string" ? lead.city : null,
        country: typeof lead.country === "string" ? lead.country : null,
        website: typeof lead.website === "string" ? lead.website : null,
        instagram_handle: typeof lead.instagram_handle === "string" ? lead.instagram_handle : null,
        facebook_page: typeof lead.facebook_page === "string" ? lead.facebook_page : null,
        google_rating: typeof lead.google_rating === "number" ? lead.google_rating : null,
        google_reviews_count: typeof lead.google_reviews_count === "number" ? lead.google_reviews_count : null,
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
