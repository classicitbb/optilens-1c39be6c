import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
