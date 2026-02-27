import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";

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
        facebook_page_id: lead.facebook_page_id,
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
    },
  });
};
