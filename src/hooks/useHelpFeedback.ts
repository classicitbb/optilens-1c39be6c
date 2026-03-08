import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const useHelpFeedback = () => {
  const { user } = useAuth();

  const submitFeedback = useMutation({
    mutationFn: async ({
      articleId,
      feedbackType,
      suggestionText,
      pageSlug,
    }: {
      articleId: string;
      feedbackType: "helpful" | "not_helpful" | "suggestion";
      suggestionText?: string;
      pageSlug?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (!UUID_RE.test(articleId)) throw new Error("Feedback is only supported for database articles");
      const { error } = await supabase.from("help_feedback").insert({
        article_id: articleId,
        user_id: user.id,
        feedback_type: feedbackType,
        suggestion_text: suggestionText || null,
        page_slug: pageSlug || null,
      });
      if (error) throw error;
    },
  });

  return { submitFeedback: submitFeedback.mutateAsync, isSubmitting: submitFeedback.isPending };
};
