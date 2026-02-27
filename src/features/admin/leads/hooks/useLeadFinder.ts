import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";

interface FinderInput {
  query: string;
  country?: string;
  cities?: string[];
<<<<<<< codex/examine-project-files-and-report-findings-6lnatk
  globalSearch?: boolean;
}

export interface LeadFinderDiagnostics {
  mode: "global" | "country_city";
  providerStatus: {
    googlePlacesConfigured: boolean;
    facebookGraphConfigured: boolean;
    instagramGraphConfigured: boolean;
    yellowPagesConfigured: boolean;
  };
  providersUsed: string[];
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
=======
>>>>>>> main
}

export const useLeadFinder = () => {
  return useMutation({
<<<<<<< codex/examine-project-files-and-report-findings-6lnatk
    mutationFn: async ({ query, country, cities, globalSearch }: FinderInput): Promise<LeadFinderResult> => {
      const { data, error } = await supabase.functions.invoke("lead-intelligence", {
        body: { query, country, cities, globalSearch: !!globalSearch, includeDiagnostics: true },
=======
    mutationFn: async ({ query, country, cities }: FinderInput) => {
      const { data, error } = await supabase.functions.invoke("lead-intelligence", {
        body: { query, country, cities },
>>>>>>> main
      });
      if (error) throw error;
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
<<<<<<< codex/examine-project-files-and-report-findings-6lnatk
      return {
        leads,
        diagnostics: (data?.diagnostics ?? null) as LeadFinderDiagnostics | null,
      };
=======
      return leads;
>>>>>>> main
    },
  });
};
