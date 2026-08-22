import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  LensRecommendationInput,
  LensRecommendationResult,
  RxOrderDraft,
} from "@/features/lens-assistant/types";

const RX_DRAFTS_QUERY_KEY = ["rx-order-drafts"] as const;

type EmbeddedRxOrderPayload = {
  schema: "cv.rxorder/1";
  patient?: { first?: string; last?: string };
  orderNo?: string;
  [key: string]: unknown;
};

const isMissingFeatureError = (error: any) =>
  /recommend_lenses|rx_order_drafts|schema cache|does not exist/i.test(String(error?.message ?? ""));

export const recommendLenses = async (input: LensRecommendationInput): Promise<LensRecommendationResult> => {
  const { data, error } = await (supabase.rpc as any)("recommend_lenses", { p_input: input });
  if (error) {
    if (isMissingFeatureError(error)) {
      return {
        status: "rules_unavailable",
        message: "The controlled recommendation service is awaiting its database release and approved rule set.",
        ruleSetId: null,
        ruleSetVersion: null,
        recommendations: [],
      };
    }
    throw error;
  }
  return data as LensRecommendationResult;
};

export const useRxDrafts = (targetUserId?: string) => {
  const { user } = useAuth();
  const effectiveUserId = targetUserId ?? user?.id;
  return useQuery<RxOrderDraft[]>({
    queryKey: [...RX_DRAFTS_QUERY_KEY, effectiveUserId],
    enabled: Boolean(user && effectiveUserId),
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await (supabase as any)
        .from("rx_order_drafts")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("updated_at", { ascending: false });
      if (error) {
        if (isMissingFeatureError(error)) return [];
        throw error;
      }
      return (data ?? []) as RxOrderDraft[];
    },
  });
};

export const isEmbeddedRxOrderPayload = (value: unknown): value is EmbeddedRxOrderPayload =>
  !!value && typeof value === "object" && (value as { schema?: unknown }).schema === "cv.rxorder/1";

export const buildEmbeddedRxOrderDraftFields = (payload: EmbeddedRxOrderPayload) => {
  const patientReference = [payload.patient?.first, payload.patient?.last]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
  const fallback = typeof payload.orderNo === "string" && payload.orderNo.trim()
    ? `Order ${payload.orderNo.trim()}`
    : "Untitled Rx order";
  const label = patientReference || fallback;

  return {
    name: `Rx order — ${label}`,
    patient_reference: patientReference || null,
    status: "draft" as const,
    input_payload: payload,
    recommendation_snapshot: null,
    rule_set_id: null,
  };
};

export const useSaveEmbeddedRxOrderDraft = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmbeddedRxOrderPayload) => {
      if (!user) throw new Error("Sign in to save an Rx order draft.");
      const { data, error } = await (supabase as any)
        .from("rx_order_drafts")
        .insert({ user_id: user.id, ...buildEmbeddedRxOrderDraftFields(payload) })
        .select("*")
        .single();
      if (error) throw error;
      return data as RxOrderDraft;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RX_DRAFTS_QUERY_KEY }),
  });
};

export const useRxDraft = (draftId: string | undefined) => {
  const { user } = useAuth();
  return useQuery<RxOrderDraft | null>({
    queryKey: [...RX_DRAFTS_QUERY_KEY, user?.id, draftId],
    enabled: Boolean(user && draftId),
    queryFn: async () => {
      if (!user || !draftId) return null;
      const { data, error } = await (supabase as any)
        .from("rx_order_drafts")
        .select("*")
        .eq("id", draftId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        if (isMissingFeatureError(error)) return null;
        throw error;
      }
      return data as RxOrderDraft | null;
    },
  });
};

export const useSaveRxDraft = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      status,
      input,
      recommendation,
    }: {
      id?: string;
      name: string;
      status: RxOrderDraft["status"];
      input: LensRecommendationInput;
      recommendation: LensRecommendationResult | null;
    }) => {
      if (!user) throw new Error("Sign in to save an Rx draft.");
      const payload = {
        user_id: user.id,
        name,
        status,
        patient_reference: input.patientReference.trim() || null,
        input_payload: input,
        recommendation_snapshot: recommendation,
        rule_set_id: recommendation?.ruleSetId ?? null,
      };
      const query = id
        ? (supabase as any).from("rx_order_drafts").update(payload).eq("id", id).eq("user_id", user.id)
        : (supabase as any).from("rx_order_drafts").insert(payload);
      const { data, error } = await query.select("*").single();
      if (error) throw error;
      return data as RxOrderDraft;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RX_DRAFTS_QUERY_KEY }),
  });
};
