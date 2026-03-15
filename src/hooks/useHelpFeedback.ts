import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createStructuredHelpdeskTicket } from "@/features/admin/helpdesk/utils/structuredTicketing";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string) => !!value && UUID_RE.test(value);

const ensureArticleId = async ({
  articleId,
  articleTitle,
  articleContent,
  articleContextSlugs,
  pageSlug,
}: {
  articleId: string;
  articleTitle?: string;
  articleContent?: string;
  articleContextSlugs?: string[];
  pageSlug?: string;
}) => {
  if (isUuid(articleId)) return articleId;

  const slug = `static-${articleId}`;
  const { data: existing, error: existingError } = await supabase
    .from("help_articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const contextSlugs = articleContextSlugs?.length ? articleContextSlugs : [pageSlug ?? "knowledge/wiki"];
  const primarySlug = contextSlugs[0] ?? "knowledge/wiki";

  const { data: created, error: createError } = await supabase
    .from("help_articles")
    .insert({
      title: articleTitle ?? articleId,
      content: articleContent ?? "",
      page_slug: primarySlug,
      slug,
      category: "knowledge-app",
      content_type: "wiki",
      visibility: "internal",
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  const { error: contextError } = await supabase
    .from("help_article_contexts")
    .insert(contextSlugs.map((context_slug) => ({ article_id: created.id, context_slug })));

  if (contextError) throw contextError;

  return created.id;
};

export const useHelpFeedback = () => {
  const { user } = useAuth();

  const submitFeedback = useMutation({
    mutationFn: async ({
      articleId,
      feedbackType,
      suggestionText,
      pageSlug,
      articleTitle,
      articleContent,
      articleContextSlugs,
    }: {
      articleId: string;
      feedbackType: "helpful" | "not_helpful" | "suggestion";
      suggestionText?: string;
      pageSlug?: string;
      articleTitle?: string;
      articleContent?: string;
      articleContextSlugs?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const resolvedArticleId = await ensureArticleId({
        articleId,
        articleTitle,
        articleContent,
        articleContextSlugs,
        pageSlug,
      });

      const { error } = await supabase.from("help_feedback").insert({
        article_id: resolvedArticleId,
        user_id: user.id,
        feedback_type: feedbackType,
        suggestion_text: suggestionText || null,
        page_slug: pageSlug || null,
      });
      if (error) throw error;

      const isPoorArticleFeedback = feedbackType === "not_helpful" || (feedbackType === "suggestion" && !!suggestionText?.trim());
      if (isPoorArticleFeedback) {
        await createStructuredHelpdeskTicket({
          title: `Article issue: ${articleTitle ?? articleId}`,
          description: [
            `Feedback type: ${feedbackType}`,
            suggestionText?.trim() ? `Suggestion: ${suggestionText.trim()}` : null,
            pageSlug ? `Context page: ${pageSlug}` : null,
          ].filter(Boolean).join("\n"),
          subtype: "article_issue",
          sourceChannel: "portal",
          sourceRoleMode: "customer",
          sourceRouteContext: "account",
          sourceAuthenticationRequired: true,
          sourceMetadata: {
            article_id: resolvedArticleId,
            feedback_type: feedbackType,
            page_slug: pageSlug ?? null,
            feedback_user_id: user.id,
          },
        });
      }
    },
  });

  return { submitFeedback: submitFeedback.mutateAsync, isSubmitting: submitFeedback.isPending };
};
