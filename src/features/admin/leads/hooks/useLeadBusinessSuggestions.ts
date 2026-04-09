import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadBusinessSuggestion {
  id: string;
  source: "web" | "contact";
  name: string;
  city: string | null;
  country: string | null;
  website: string | null;
  score: number | null;
}

const normalizeKey = (name: string, city?: string | null, country?: string | null) =>
  `${name.trim().toLowerCase()}|${(city ?? "").trim().toLowerCase()}|${(country ?? "").trim().toLowerCase()}`;

export const useLeadBusinessSuggestions = (query: string) => {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ["lead-business-suggestions", trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const [webRes, contactRes] = await Promise.all([
        supabase.functions.invoke("lead-intelligence", {
          body: { query: trimmed, cities: [], country: null },
        }),
        (supabase.from("contacts") as any)
          .select("id,name,city,country,website,ai_intent_score")
          .ilike("name", `%${trimmed}%`)
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

      if (webRes.error) throw webRes.error;
      if (contactRes.error) throw contactRes.error;

      const webLeads = ((webRes.data?.leads ?? []) as any[]).map((lead) => ({
        id: `web-${lead.id ?? crypto.randomUUID()}`,
        source: "web" as const,
        name: lead.name,
        city: lead.city ?? null,
        country: lead.country ?? null,
        website: lead.website ?? null,
        score: Number(lead.score ?? 0),
      }));

      const contacts = (contactRes.data ?? []).map((contact: any) => ({
        id: `contact-${contact.id}`,
        source: "contact" as const,
        name: contact.name,
        city: contact.city ?? null,
        country: contact.country ?? null,
        website: contact.website ?? null,
        score: contact.ai_intent_score != null ? Number(contact.ai_intent_score) : null,
      }));

      const merged = [...webLeads, ...contacts];
      const seen = new Set<string>();

      return merged.filter((item) => {
        const key = normalizeKey(item.name, item.city, item.country);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }) as LeadBusinessSuggestion[];
    },
    staleTime: 1000 * 20,
  });
};
