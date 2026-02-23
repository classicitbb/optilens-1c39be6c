import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  page_slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useHelpArticles = (pageSlug?: string) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["help_articles", pageSlug],
    queryFn: async () => {
      let q = supabase
        .from("help_articles")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (pageSlug) {
        q = q.or(`page_slug.eq.${pageSlug},page_slug.eq.all`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as HelpArticle[];
    },
  });

  const allArticlesQuery = useQuery({
    queryKey: ["help_articles_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .order("page_slug")
        .order("sort_order");
      if (error) throw error;
      return data as HelpArticle[];
    },
    enabled: false, // only fetch when needed
  });

  const upsertMutation = useMutation({
    mutationFn: async (article: Partial<HelpArticle> & { title: string; content: string; page_slug: string }) => {
      if (article.id) {
        const { error } = await supabase
          .from("help_articles")
          .update({ title: article.title, content: article.content, page_slug: article.page_slug, sort_order: article.sort_order ?? 0 })
          .eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("help_articles")
          .insert({ title: article.title, content: article.content, page_slug: article.page_slug, sort_order: article.sort_order ?? 0 });
        if (error) throw error;
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
