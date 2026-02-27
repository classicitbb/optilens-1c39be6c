import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";

export const useLeads = () => {
  return useQuery({
    queryKey: ["leads-v1"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id,name,country,city,website,instagram_handle,facebook_page,google_rating,google_reviews_count,ai_intent_score,status,notes")
        .eq("status", "lead")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        score: Number(row.ai_intent_score ?? 0),
      })) as LeadRecord[];
    },
  });
};
