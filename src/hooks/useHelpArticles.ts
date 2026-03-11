import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { canViewContextSlug } from "@/lib/wikiPermissions";

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  page_slug: string;
  context_slugs: string[];
  category?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HelpArticleRow extends Omit<HelpArticle, "context_slugs"> {
  help_article_contexts?: { context_slug: string }[] | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string) => !!value && UUID_RE.test(value);

const normalizeArticle = (row: HelpArticleRow): HelpArticle => {
  const context_slugs = row.help_article_contexts?.map((ctx) => ctx.context_slug).filter(Boolean) ?? [];
  const deduped = context_slugs.length > 0 ? [...new Set(context_slugs)] : [row.page_slug || "all"];
  return {
    ...row,
    context_slugs: deduped,
  };
};

export const useHelpArticles = (pageSlug?: string) => {
  const qc = useQueryClient();
  const { canView } = useRolePermissions();

  const query = useQuery({
    queryKey: ["help_articles", pageSlug],
    queryFn: async () => {
      const query = supabase
        .from("help_articles")
        .select("*, help_article_contexts(context_slug)")
        .eq("is_active", true)
        .order("sort_order");
      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as unknown as HelpArticleRow[])
        .map(normalizeArticle)
        .filter((article) => article.context_slugs.some((contextSlug) => canViewContextSlug(contextSlug, canView)))
        .filter((article) => !pageSlug || article.context_slugs.includes(pageSlug) || article.context_slugs.includes("all"));
    },
    enabled: canView("wiki"),
  });

  const allArticlesQuery = useQuery({
    queryKey: ["help_articles_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*, help_article_contexts(context_slug)")
        .order("sort_order");
      if (error) throw error;
      return ((data ?? []) as HelpArticleRow[]).map(normalizeArticle);
    },
    enabled: false, // only fetch when needed
  });

  const upsertMutation = useMutation({
    mutationFn: async (article: Partial<HelpArticle> & { title: string; content: string; page_slug?: string; category?: string; context_slugs?: string[] }) => {
      const contexts = [...new Set((article.context_slugs ?? [article.page_slug ?? "all"]).filter(Boolean))];
      const primarySlug = contexts[0] ?? "all";
      const payload: {
        title: string;
        content: string;
        page_slug: string;
        sort_order: number;
        category?: string;
      } = {
        title: article.title,
        content: article.content,
        page_slug: primarySlug,
        sort_order: article.sort_order ?? 0,
      };
      if (article.category !== undefined) payload.category = article.category;
      if (isUuid(article.id)) {
        const { error } = await supabase
          .from("help_articles")
          .update(payload)
          .eq("id", article.id);
        if (error) throw error;

        const { error: deleteContextError } = await supabase
          .from("help_article_contexts")
          .delete()
          .eq("article_id", article.id);
        if (deleteContextError) throw deleteContextError;

        const { error: insertContextError } = await supabase
          .from("help_article_contexts")
          .insert(contexts.map((context_slug) => ({ article_id: article.id as string, context_slug })));
        if (insertContextError) throw insertContextError;
      } else {
        const { data, error } = await supabase
          .from("help_articles")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;

        const { error: insertContextError } = await supabase
          .from("help_article_contexts")
          .insert(contexts.map((context_slug) => ({ article_id: data.id, context_slug })));
        if (insertContextError) throw insertContextError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles_all"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("help_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles_all"] });
    },
  });

  return { articles: query.data ?? [], isLoading: query.isLoading, upsertArticle: upsertMutation.mutateAsync, deleteArticle: deleteMutation.mutateAsync, refetchAll: allArticlesQuery.refetch, allArticles: allArticlesQuery.data ?? [] };
};
