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

/**
 * A draft keeps its database identity even when an older Lens Assistant
 * payload is upgraded to the embedded order payload on its next save.
 */
export const resolveResumedRxDraftId = (draftId: string | undefined, payload: unknown) =>
  draftId && payload ? draftId : undefined;

export const buildEmbeddedRxOrderDraftFields = (payload: EmbeddedRxOrderPayload) => {
  const patientReference = [payload.patient?.first, payload.patient?.last]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
  const fallback = typeof payload.orderNo === "string" && payload.orderNo.trim()
    ? `Order ${payload.orderNo.trim()}`
    : "Untitled Rx order";
  const label = patientReference || fallback;
  const orderNumber = typeof payload.orderNo === "string" ? payload.orderNo.trim() : "";

  return {
    name: `Rx order — ${label}${orderNumber && !label.includes(orderNumber) ? ` · Order ${orderNumber}` : ""}`,
    patient_reference: patientReference || null,
    status: "draft" as const,
    input_payload: payload,
    recommendation_snapshot: null,
    rule_set_id: null,
  };
};

// Autosave (see RxOrderEmbed) calls this on every settled change, so a plain
// insert would spawn a fresh row each time. Once a draft has an id — either
// because the form resumed one, or because a prior save in this session
// already created one — every later save updates that same row instead.
export const useSaveEmbeddedRxOrderDraft = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload, id }: { payload: EmbeddedRxOrderPayload; id?: string }) => {
      if (!user) throw new Error("Sign in to save an Rx order draft.");
      const fields = buildEmbeddedRxOrderDraftFields(payload);
      let targetId = id;
      if (!targetId && payload.orderNo?.trim()) {
        const { data: existing, error: lookupError } = await (supabase as any)
          .from("rx_order_drafts")
          .select("id")
          .eq("user_id", user.id)
          .contains("input_payload", { orderNo: payload.orderNo.trim() })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lookupError) throw lookupError;
        targetId = existing?.id;
      }
      const query = targetId
        ? (supabase as any).from("rx_order_drafts").update(fields).eq("id", targetId).eq("user_id", user.id)
        : (supabase as any).from("rx_order_drafts").insert({ user_id: user.id, ...fields });
      const { data, error } = await query.select("*").single();
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

export const useDeleteRxDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("rx_order_drafts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RX_DRAFTS_QUERY_KEY }),
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
