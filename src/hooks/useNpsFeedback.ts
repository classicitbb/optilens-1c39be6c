import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NpsTriggerContext = "order" | "helpdesk_ticket" | "manual" | "other";

interface SubmitNpsInput {
  score: number;
  comment?: string;
  triggerContext: NpsTriggerContext;
  sourceId?: string | null;
  sourceLabel?: string | null;
}

/**
 * Checks whether the signed-in user has already responded to the NPS prompt
 * for a given trigger + source (e.g. this exact order, this exact ticket), and
 * exposes a mutation to submit a new response.
 *
 * `sourceId` should be omitted for prompts that aren't tied to one specific
 * record (e.g. a general "how are we doing" prompt) — those are always askable.
 */
export const useNpsFeedback = ({
  triggerContext,
  sourceId,
}: {
  triggerContext: NpsTriggerContext;
  sourceId?: string | null;
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const queryKey = ["nps-response", user?.id, triggerContext, sourceId ?? null];

  const { data: existingResponse, isLoading } = useQuery({
    queryKey,
    enabled: !!user && !!sourceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nps_responses")
        .select("id,score")
        .eq("user_id", user!.id)
        .eq("trigger_context", triggerContext)
        .eq("source_id", sourceId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; score: number } | null;
    },
  });

  const submit = useMutation({
    mutationFn: async ({ score, comment, triggerContext: ctx, sourceId: sid, sourceLabel }: SubmitNpsInput) => {
      if (!user) throw new Error("You must be signed in to submit feedback.");
      const { error } = await (supabase.from("nps_responses") as any).insert({
        user_id: user.id,
        contact_email: user.email ?? null,
        score,
        comment: comment?.trim() || null,
        trigger_context: ctx,
        source_id: sid ?? null,
        source_label: sourceLabel ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  return {
    hasResponded: !!existingResponse,
    isChecking: isLoading,
    submitNps: submit.mutateAsync,
    isSubmitting: submit.isPending,
  };
};
