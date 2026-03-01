import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord, LeadStatus } from "../types";

interface CreateLeadInput {
  name: string;
  country?: string;
  city?: string;
  website?: string;
  status?: LeadStatus;
  score?: number;
  notes?: string;
}

const SAMPLE_LEADS: CreateLeadInput[] = [
  {
    name: "Bright Vision Optical - Kingston",
    city: "Kingston",
    country: "Jamaica",
    website: "https://brightvision-ja.example",
    status: "lead",
    score: 82,
    notes: "High review velocity and active social pages.",
  },
  {
    name: "Island Eye Centre - Port of Spain",
    city: "Port of Spain",
    country: "Trinidad & Tobago",
    website: "https://islandeye-tt.example",
    status: "contacted",
    score: 67,
    notes: "Interested in faster lens turnaround for single vision SKUs.",
  },
  {
    name: "Caribe Optical Studio - Bridgetown",
    city: "Bridgetown",
    country: "Barbados",
    website: "https://caribeoptical-bb.example",
    status: "proposal",
    score: 91,
    notes: "Requesting anti-reflective premium bundle proposal.",
  },
];

const upsertLead = async (lead: CreateLeadInput) => {
  const payload = {
    name: lead.name,
    country: lead.country ?? null,
    city: lead.city ?? null,
    website: lead.website ?? null,
    status: lead.status ?? "lead",
    ai_intent_score: lead.score ?? 0,
    notes: lead.notes ?? null,
  };

  const { error } = await supabase
    .from("contacts")
    .upsert(payload as any, { onConflict: "name" });

  if (error) throw error;
};

export const useLeads = () => {
  return useQuery({
    queryKey: ["leads-v1"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id,name,country,city,website,instagram_handle,facebook_page,google_rating,google_reviews_count,ai_intent_score,status,notes,lead_source,lead_segment")
        .in("status", ["lead", "contacted", "meeting", "proposal"])
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

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: CreateLeadInput) => {
      await upsertLead(lead);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads-v1"] });
    },
  });
};

export const useSeedSampleLeads = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      for (const lead of SAMPLE_LEADS) {
        await upsertLead(lead);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads-v1"] });
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
    },
  });
};
