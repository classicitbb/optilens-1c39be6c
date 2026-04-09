import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRecord } from "../types";
import { buildCampaignPacket, inferLeadSegment } from "../utils/campaignActivation";

export const useCampaignActivationProfiles = (contactIds: string[]) => {
  return useQuery({
    queryKey: ["campaign-activation-profiles", contactIds.join(",")],
    enabled: contactIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("campaign_activation_profiles") as any)
        .select("id,contact_id,lead_source,lead_segment,packet,created_at")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateCampaignActivationProfiles = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leads: LeadRecord[]) => {
      if (leads.length === 0) return;
      const payload = leads.map((lead) => {
        const segment = inferLeadSegment(lead);
        const packet = buildCampaignPacket(segment);
        return {
          contact_id: lead.id,
          lead_source: lead.lead_source || "lead_finder",
          lead_segment: segment,
          audience_hypotheses: packet.audienceHypotheses,
          creative_angles: packet.creativeAngles,
          channel_recommendations: packet.channelRecommendations,
          meta_audience_definitions: packet.metaAudienceDefinitions,
          meta_messaging_variants: packet.metaMessagingVariants,
          packet,
        };
      });

      const { error } = await (supabase.from("campaign_activation_profiles") as any).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-activation-profiles"] });
    },
  });
};

export const useLogCampaignPerformance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      profileId?: string | null;
      contactId?: string | null;
      leadSource: string;
      leadSegment: string;
      channel: string;
      campaignName: string;
      impressions: number;
      clicks: number;
      qualifiedLeads: number;
      conversions: number;
      spend: number;
      revenue: number;
    }) => {
      const { error } = await (supabase.from("campaign_activation_performance") as any).insert({
        profile_id: payload.profileId ?? null,
        contact_id: payload.contactId ?? null,
        lead_source: payload.leadSource,
        lead_segment: payload.leadSegment,
        channel: payload.channel,
        campaign_name: payload.campaignName,
        impressions: payload.impressions,
        clicks: payload.clicks,
        qualified_leads: payload.qualifiedLeads,
        conversions: payload.conversions,
        spend: payload.spend,
        revenue: payload.revenue,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign-activation-performance"] });
    },
  });
};
