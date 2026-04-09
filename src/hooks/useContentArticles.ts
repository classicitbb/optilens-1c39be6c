import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VISIBILITY_SCOPES } from "@/domain/statuses";
import { toKnowledgeDocumentEntity } from "@/domain/services/recordMappers";

export type ContentVisibility = Extract<(typeof VISIBILITY_SCOPES)[number], "internal" | "customer" | "public"> | "draft";
export type ContentType = "wiki" | "knowledge" | "faq" | "legal";

export interface ContentArticle {
  id: string;
  title: string;
  content: string;
  body_json?: unknown;
  description: string;
  page_slug: string;
  category: string;
  content_type: ContentType;
  visibility: ContentVisibility;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  status?: "draft" | "published" | "archived" | null;
}

export const VISIBILITY_OPTIONS: { value: ContentVisibility; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-slate-500" },
  { value: "internal", label: "Internal", color: "bg-blue-500" },
  { value: "customer", label: "Customer", color: "bg-amber-500" },
  { value: "public", label: "Public", color: "bg-green-500" },
];

export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "wiki", label: "Wiki / Help" },
  { value: "knowledge", label: "Knowledge Base" },
  { value: "faq", label: "FAQ" },
  { value: "legal", label: "Legal Page" },
];

export const useContentArticles = (contentType?: ContentType) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["content_articles", contentType],
    queryFn: async () => {
      let q = supabase
        .from("help_articles")
        .select("*")
        .order("category")
        .order("sort_order");

      if (contentType) {
        q = q.eq("content_type", contentType);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as ContentArticle[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (
      article: Partial<ContentArticle> & { title: string; content: string; page_slug: string }
    ) => {
      const payload = {
        title: article.title,
        content: article.content,
        page_slug: article.page_slug,
        sort_order: article.sort_order ?? 0,
        description: article.description ?? "",
        category: article.category ?? "",
        content_type: article.content_type ?? "wiki",
        visibility: article.visibility ?? "internal",
        is_active: article.is_active ?? true,
      };

      if (article.id) {
        const { error } = await supabase
          .from("help_articles")
          .update(payload)
          .eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("help_articles") as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("help_articles") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles"] });
    },
  });

  return {
    articles: query.data ?? [],
    isLoading: query.isLoading,
    upsertArticle: upsertMutation.mutateAsync,
    deleteArticle: deleteMutation.mutateAsync,
    isSaving: upsertMutation.isPending,
  };
};

/** Fetch only public articles for the website knowledge base */
export const usePublicKnowledge = () => {
  return useQuery({
    queryKey: ["public_knowledge"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .in("content_type", ["knowledge", "faq"])
        .eq("is_active", true)
        .order("category")
        .order("sort_order");

      if (error) throw error;

      const visible = ((data || []) as ContentArticle[]).filter((article) => {
        const publishState = article.status ?? "published";
        const visibility = article.visibility ?? "public";
        return publishState === "published" && ["public", "customer"].includes(visibility);
      });

      return visible;
    },
  });
};


export const useKnowledgeDocumentEntities = () => {
  return useQuery({
    queryKey: ["knowledge_document_entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .in("content_type", ["knowledge", "faq", "wiki"]);

      if (error) throw error;
      return ((data || []) as ContentArticle[]).map(toKnowledgeDocumentEntity);
    },
  });
};

/** Fetch a single legal page by page_slug */
export const useLegalPage = (slug: string) => {
  return useQuery({
    queryKey: ["legal_page", slug],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("help_articles")
        .select("*")
        .eq("content_type", "legal")
        .eq("page_slug", slug)
        .eq("is_active", true) as any)
        .eq("status", "published")
        .in("visibility", ["public", "customer"])
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return (data as ContentArticle) || null;
    },
  });
};
