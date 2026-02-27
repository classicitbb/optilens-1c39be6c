import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Opportunity {
  id: string;
  title: string;
  stage: "new" | "contacted" | "meeting_completed" | "proposal" | "won" | "lost";
  country: string | null;
  volume_tier: string | null;
  estimated_value: number | null;
  contact_id: string;
  created_at: string;
}

interface CreateOpportunityInput {
  contactName: string;
  opportunityTitle: string;
  country?: string;
  city?: string;
  stage?: Opportunity["stage"];
  volumeTier?: string;
  estimatedValue?: number;
}

const SAMPLE_OPPORTUNITIES: CreateOpportunityInput[] = [
  {
    contactName: "Bright Vision Optical - Kingston",
    opportunityTitle: "Kingston AR Bundle Expansion",
    country: "Jamaica",
    city: "Kingston",
    stage: "new",
    volumeTier: "high",
    estimatedValue: 12500,
  },
  {
    contactName: "Island Eye Centre - Port of Spain",
    opportunityTitle: "Premium Progressive Pilot",
    country: "Trinidad & Tobago",
    city: "Port of Spain",
    stage: "contacted",
    volumeTier: "medium",
    estimatedValue: 9800,
  },
  {
    contactName: "Caribe Optical Studio - Bridgetown",
    opportunityTitle: "Fast-Turn SV Stock Program",
    country: "Barbados",
    city: "Bridgetown",
    stage: "proposal",
    volumeTier: "medium",
    estimatedValue: 14300,
  },
];

const upsertOpportunity = async (input: CreateOpportunityInput) => {
  const contactPayload = {
    name: input.contactName,
    country: input.country ?? null,
    city: input.city ?? null,
    status: "lead",
  };

  const { data: contact, error: contactErr } = await supabase
    .from("contacts")
    .upsert(contactPayload as any, { onConflict: "name" })
    .select("id")
    .single();

  if (contactErr) throw contactErr;

  const opportunityPayload = {
    contact_id: contact.id,
    title: input.opportunityTitle,
    stage: input.stage ?? "new",
    country: input.country ?? null,
    volume_tier: input.volumeTier ?? "medium",
    estimated_value: input.estimatedValue ?? null,
  };

  const { error: oppErr } = await supabase
    .from("opportunities" as any)
    .upsert(opportunityPayload as any, { onConflict: "contact_id,title" });

  if (oppErr) throw oppErr;
};

export const useOpportunities = () => {
  return useQuery({
    queryKey: ["crm-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities" as any)
        .select("id,title,stage,country,volume_tier,estimated_value,contact_id,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Opportunity[];
    },
  });
};

export const useUpdateOpportunityStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Opportunity["stage"] }) => {
      const { error } = await supabase
        .from("opportunities" as any)
        .update({ stage, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-opportunities"] }),
  });
};

export const useCreateOpportunity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOpportunityInput) => {
      await upsertOpportunity(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-opportunities"] }),
  });
};

export const useSeedSampleOpportunities = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      for (const sample of SAMPLE_OPPORTUNITIES) {
        await upsertOpportunity(sample);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-opportunities"] }),
  });
};
