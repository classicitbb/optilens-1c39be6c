import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { canViewContextSlug } from "@/lib/wikiPermissions";
import { canonicalToHtml, toCanonicalDocument } from "@/lib/wikiCanonical";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  body_json: BlogCanonicalContent | null;
  page_slug: string;
  context_slugs: string[];
  category?: string;
  sort_order: number;
  is_active: boolean;
  status: "draft" | "published" | "archived";
  slug?: string | null;
  summary?: string;
  parent_id?: string | null;
  section_id?: string | null;
  version_number?: number;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelpArticleVersion {
  version_id: string;
  article_id: string;
  title_snapshot: string;
  body_snapshot: BlogCanonicalContent;
  saved_by?: string | null;
  saved_at: string;
  change_note?: string | null;
  version_number: number;
}

interface HelpArticleRow extends Omit<HelpArticle, "context_slugs" | "body_json" | "status"> {
  body_json?: any;
  status?: "draft" | "published" | "archived";
  help_article_contexts?: { context_slug: string }[] | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string) => !!value && UUID_RE.test(value);

const normalizeArticle = (row: HelpArticleRow): HelpArticle => {
  const context_slugs = row.help_article_contexts?.map((ctx) => ctx.context_slug).filter(Boolean) ?? [];
  const deduped = context_slugs.length > 0 ? [...new Set(context_slugs)] : [row.page_slug || "all"];
  return {
    ...row,
    status: row.status ?? "published",
    body_json: toCanonicalDocument((row as any).body_json ?? row.content),
    context_slugs: deduped,
  };
};

export const useHelpArticles = (pageSlug?: string) => {
  const qc = useQueryClient();
  const { canView, canEditFeature } = useRolePermissions();
  const canPublish = canEditFeature("wiki");

  const query = useQuery({
    queryKey: ["help_articles", pageSlug, canPublish],
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
      const { data, error } = await supabase.from("help_articles").select("*, help_article_contexts(context_slug)").order("sort_order");
      if (error) throw error;
      return ((data ?? []) as HelpArticleRow[]).map(normalizeArticle);
    },
    enabled: false,
  });

  const saveVersionSnapshot = async (articleId: string, title: string, body: BlogCanonicalContent, versionNumber: number, changeNote?: string) => {
    const { error } = await (supabase as any).from("help_article_versions").insert({
      article_id: articleId,
      title_snapshot: title,
      body_snapshot: body,
      change_note: changeNote ?? null,
      version_number: versionNumber,
    });
    if (error) throw error;
  };

  const upsertMutation = useMutation({
    mutationFn: async (article: Partial<HelpArticle> & { title: string; content: string; page_slug?: string; category?: string; context_slugs?: string[]; change_note?: string }) => {
      const contexts = [...new Set((article.context_slugs ?? [article.page_slug ?? "all"]).filter(Boolean))];
      const primarySlug = contexts[0] ?? "all";
      const payload: Record<string, any> = {
        title: article.title,
        content: article.content,
        page_slug: primarySlug,
        sort_order: article.sort_order ?? 0,
        category: article.category ?? "",
        slug: article.slug ?? null,
        summary: article.summary ?? "",
        section_id: article.section_id ?? null,
        parent_id: article.parent_id ?? null,
        status: article.status ?? "draft",
      };

      if (isUuid(article.id)) {
        const nextVersion = (article.version_number ?? 1) + 1;
        payload.version_number = nextVersion;
        payload.published_at = payload.status === "published" ? new Date().toISOString() : null;
        const { error } = await (supabase as any).from("help_articles").update(payload).eq("id", article.id);
        if (error) throw error;

        if (article.context_slugs && article.context_slugs.length > 0) {
          const { error: deleteContextError } = await supabase.from("help_article_contexts").delete().eq("article_id", article.id);
          if (deleteContextError) throw deleteContextError;
          const { error: insertContextError } = await supabase.from("help_article_contexts").insert(contexts.map((context_slug) => ({ article_id: article.id as string, context_slug })));
          if (insertContextError) throw insertContextError;
        }

        await saveVersionSnapshot(article.id, article.title, article.content, nextVersion, article.change_note);
      } else {
        payload.version_number = 1;
        payload.published_at = payload.status === "published" ? new Date().toISOString() : null;
        const { data, error } = await (supabase as any).from("help_articles").insert(payload).select("id").single();
        if (error) throw error;

        const { error: insertContextError } = await supabase.from("help_article_contexts").insert(contexts.map((context_slug) => ({ article_id: data.id, context_slug })));
        if (insertContextError) throw insertContextError;

        await saveVersionSnapshot(data.id, article.title, bodyJson, 1, article.change_note ?? "Initial draft");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles_all"] });
      qc.invalidateQueries({ queryKey: ["help_article_versions"] });
    },
  });

  const versionsQuery = useMutation({
    mutationFn: async (articleId: string) => {
      const { data, error } = await (supabase as any)
        .from("help_article_versions")
        .select("*")
        .eq("article_id", articleId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HelpArticleVersion[];
    },
  });

  const restoreVersion = useMutation({
    mutationFn: async ({ articleId, version }: { articleId: string; version: HelpArticleVersion }) => {
      const { data: current, error: fetchError } = await (supabase as any).from("help_articles").select("version_number").eq("id", articleId).single();
      if (fetchError) throw fetchError;
      const nextVersion = ((current as any)?.version_number ?? 1) + 1;
      const { error } = await supabase.from("help_articles").update({
        title: version.title_snapshot,
        body_json: version.body_snapshot,
        content: canonicalToHtml(version.body_snapshot),
        body_html: canonicalToHtml(version.body_snapshot),
        version_number: nextVersion,
      } as any).eq("id", articleId);
      if (error) throw error;
      await saveVersionSnapshot(articleId, version.title_snapshot, version.body_snapshot, nextVersion, `Rollback to v${version.version_number}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      qc.invalidateQueries({ queryKey: ["help_article_versions"] });
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

  return {
    articles: query.data ?? [],
    isLoading: query.isLoading,
    upsertArticle: upsertMutation.mutateAsync,
    deleteArticle: deleteMutation.mutateAsync,
    refetchAll: allArticlesQuery.refetch,
    allArticles: allArticlesQuery.data ?? [],
    fetchVersions: versionsQuery.mutateAsync,
    isFetchingVersions: versionsQuery.isPending,
    restoreVersion: restoreVersion.mutateAsync,
    isRestoringVersion: restoreVersion.isPending,
    canPublish,
  };
};
