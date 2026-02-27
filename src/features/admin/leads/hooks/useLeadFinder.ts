import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";

interface FinderInput {
  query: string;
  country?: string;
  cities?: string[];
}

export const useLeadFinder = () => {
  return useMutation({
    mutationFn: async ({ query, country, cities }: FinderInput) => {
      const { data, error } = await supabase.functions.invoke("lead-intelligence", {
        body: { query, country, cities },
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
      return leads;
    },
  });
};
