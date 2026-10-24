import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useToast } from "@/hooks/use-toast";
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
  content_type?: string;
  visibility?: string;
  slug?: string | null;
  summary?: string;
  parent_id?: string | null;
  section_id?: string | null;
  author_id?: string | null;
  last_edited_by?: string | null;
  /** Unpublished edits to a published page. Present only once the draft-copy migration is applied. */
  draft_title?: string | null;
  draft_body_json?: BlogCanonicalContent | null;
  draft_saved_at?: string | null;
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

const EMPTY_ARTICLES: HelpArticle[] = [];

const normalizeArticle = (row: HelpArticleRow): HelpArticle => {
  const context_slugs = row.help_article_contexts?.map((ctx) => ctx.context_slug).filter(Boolean) ?? [];
  const deduped = context_slugs.length > 0 ? [...new Set(context_slugs)] : [row.page_slug || "all"];
  const canonical = toCanonicalDocument((row as any).body_json ?? row.content);
  return {
    ...row,
    status: row.status ?? "published",
    content: canonicalToHtml(canonical),
    body_json: canonical,
    context_slugs: deduped,
    ...("draft_body_json" in row
      ? { draft_body_json: (row as any).draft_body_json ? toCanonicalDocument((row as any).draft_body_json) : null }
      : {}),
  };
};

/** Placement and descriptive fields that apply to the live page immediately (like a tree move). */
export interface AutosaveMeta {
  summary?: string;
  section_id?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  slug?: string;
}

export interface AutosaveInput {
  id: string;
  title?: string;
  doc?: BlogCanonicalContent;
  /** Write the body to the draft copy instead of the live page (published pages). */
  asDraft?: boolean;
  /** Whether the draft-copy columns exist; when they do, a live write clears any stale draft. */
  supportsDrafts?: boolean;
  meta?: AutosaveMeta;
  now?: string;
}

/**
 * The row update for one autosave. Never touches version_number, status or published_at, and
 * never writes the live body of a published page: that only happens through Update.
 */
export const buildAutosaveUpdate = ({ title, doc, asDraft, supportsDrafts, meta, now }: AutosaveInput): Record<string, unknown> => {
  const update: Record<string, unknown> = { ...(meta ?? {}) };
  if (doc === undefined) return update;
  if (asDraft) {
    return { ...update, draft_title: title ?? null, draft_body_json: doc, draft_saved_at: now ?? new Date().toISOString() };
  }
  const html = canonicalToHtml(doc);
  return {
    ...update,
    ...(title !== undefined ? { title } : {}),
    body_json: doc,
    content: html,
    body_html: html,
    ...(supportsDrafts ? { draft_title: null, draft_body_json: null, draft_saved_at: null } : {}),
  };
};

/** First free slug for a title: the base, then base-2, base-3 … */
export const uniqueSlug = (base: string, taken: Iterable<string | null | undefined>): string => {
  const used = new Set(taken);
  const root = base || "untitled";
  if (!used.has(root)) return root;
  let n = 2;
  while (used.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
};

/** Plain version listing (newest first) for query-driven UI such as the history panel. */
export const listArticleVersions = async (articleId: string): Promise<HelpArticleVersion[]> => {
  const { data, error } = await (supabase as any)
    .from("help_article_versions")
    .select("*")
    .eq("article_id", articleId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HelpArticleVersion[];
};

export const useHelpArticles = (pageSlug?: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const canPublish = canEditFeature("wiki");

  const query = useQuery({
    queryKey: ["help_articles", pageSlug, canPublish],
    queryFn: async () => {
      const query = (supabase.from("help_articles") as any)
        .select("*, help_article_contexts(context_slug)")
        .eq("is_active", true)
        .order("sort_order");
      const { data, error } = await query;
      if (error) throw error;

      const all = ((data ?? []) as unknown as HelpArticleRow[])
        .map(normalizeArticle)
        .filter((article) => article.context_slugs.some((contextSlug) => canViewContextSlug(contextSlug, canView)));

      // When used as the wiki CMS (knowledge/wiki), show ALL articles so admins can manage everything
      if (pageSlug === "knowledge/wiki") return all;

      return all.filter((article) => !pageSlug || article.context_slugs.includes(pageSlug) || article.context_slugs.includes("all"));
    },
    enabled: canView("wiki"),
  });

  const allArticlesQuery = useQuery({
    queryKey: ["help_articles_all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("help_articles") as any).select("*, help_article_contexts(context_slug)").order("sort_order");
      if (error) throw error;
      return ((data ?? []) as HelpArticleRow[]).map(normalizeArticle);
    },
    enabled: false,
  });

  const supportsDrafts = (query.data ?? []).some((article) => "draft_body_json" in article);
  const supportsDraftsRef = useRef(supportsDrafts);
  supportsDraftsRef.current = supportsDrafts;

  const saveVersionSnapshot = async (articleId: string, title: string, body: BlogCanonicalContent, versionNumber: number, changeNote?: string) => {
    const { error } = await (supabase as any).from("help_article_versions").insert({
      article_id: articleId,
      title_snapshot: title,
      body_snapshot: body,
      change_note: changeNote ?? null,
      version_number: versionNumber,
    });
    if (error) {
      // The history table may be missing on a project that has not applied the migration. The
      // article itself is already saved, so report "history not recorded" instead of a failed save.
      if ((error as { code?: string }).code === "PGRST205" || (error as { code?: string }).code === "42P01") {
        console.warn("help_article_versions is not available; version history was not recorded.", error);
        return false;
      }
      throw error;
    }
    return true;
  };

  const upsertMutation = useMutation({
    mutationFn: async (
      article: Partial<HelpArticle> & {
        title: string;
        content: string;
        page_slug?: string;
        category?: string;
        context_slugs?: string[];
        change_note?: string;
        summary?: string | null;
        parent_id?: string | null;
        section_id?: string | null;
        slug?: string | null;
      }
    ) => {
      const contexts = [...new Set((article.context_slugs ?? [article.page_slug ?? "all"]).filter(Boolean))];
      const primarySlug = contexts[0] ?? "all";
      const canonical = toCanonicalDocument(article.content);
      const contentHtml = canonicalToHtml(canonical);
      const payload: Record<string, any> = {
        title: article.title,
        content: contentHtml,
        body_json: canonical,
        body_html: contentHtml,
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
        if (supportsDraftsRef.current) Object.assign(payload, { draft_title: null, draft_body_json: null, draft_saved_at: null });
        const { error } = await (supabase as any).from("help_articles").update(payload).eq("id", article.id);
        if (error) throw error;

        if (article.context_slugs && article.context_slugs.length > 0) {
          const { error: deleteContextError } = await (supabase.from("help_article_contexts") as any).delete().eq("article_id", article.id);
          if (deleteContextError) throw deleteContextError;
          const { error: insertContextError } = await (supabase.from("help_article_contexts") as any).insert(contexts.map((context_slug) => ({ article_id: article.id as string, context_slug })));
          if (insertContextError) throw insertContextError;
        }

        return { historyRecorded: await saveVersionSnapshot(article.id, article.title, canonical, nextVersion, article.change_note) };
      } else {
        payload.version_number = 1;
        payload.published_at = payload.status === "published" ? new Date().toISOString() : null;
        const { data, error } = await (supabase as any).from("help_articles").insert(payload).select("id").single();
        if (error) throw error;

        const { error: insertContextError } = await (supabase.from("help_article_contexts") as any).insert(contexts.map((context_slug) => ({ article_id: data.id, context_slug })));
        if (insertContextError) throw insertContextError;

        return { historyRecorded: await saveVersionSnapshot(data.id, article.title, canonical, 1, article.change_note ?? "Initial draft") };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles_all"] });
      qc.invalidateQueries({ queryKey: ["help_article_versions"] });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : "Something went wrong while saving. Please try again.";
      toast({ title: "Save failed", description, variant: "destructive" });
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
      const { error } = await (supabase.from("help_articles") as any).update({
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

  // Autosave: no version bump, no snapshot, no status change. See buildAutosaveUpdate.
  const autosaveMutation = useMutation({
    mutationFn: async (input: AutosaveInput) => {
      const update = buildAutosaveUpdate({ ...input, supportsDrafts: input.supportsDrafts ?? supportsDraftsRef.current });
      if (Object.keys(update).length === 0) return;
      const { error } = await (supabase.from("help_articles") as any).update(update).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
    },
  });

  // Throw away the unpublished edits of a published page; the live page is untouched.
  const discardDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("help_articles") as any)
        .update({ draft_title: null, draft_body_json: null, draft_saved_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
    },
  });

  const contextsMutation = useMutation({
    mutationFn: async ({ id, slugs }: { id: string; slugs: string[] }) => {
      const contexts = [...new Set(slugs.filter(Boolean))];
      if (contexts.length === 0) return;
      const { error: deleteError } = await (supabase.from("help_article_contexts") as any).delete().eq("article_id", id);
      if (deleteError) throw deleteError;
      const { error: insertError } = await (supabase.from("help_article_contexts") as any).insert(contexts.map((context_slug) => ({ article_id: id, context_slug })));
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
    },
  });

  // Moves, renames and status flips touch metadata only: no version bump, no snapshot.
  const moveMutation = useMutation({
    mutationFn: async (
      updates: { id: string; parent_id: string | null; section_id: string | null; sort_order: number }[],
    ) => {
      const results = await Promise.all(
        updates.map(({ id, ...placement }) =>
          (supabase.from("help_articles") as any).update(placement).eq("id", id),
        ),
      );
      const failed = results.find((result: { error: unknown }) => result.error);
      if (failed) throw failed.error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles_all"] });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : "Could not move the page. Please try again.";
      toast({ title: "Move failed", description, variant: "destructive" });
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      status?: "draft" | "published" | "archived";
      title?: string;
    }) => {
      const { error } = await (supabase.from("help_articles") as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles_all"] });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : "Could not update the page. Please try again.";
      toast({ title: "Update failed", description, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("help_articles") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help_articles"] });
      qc.invalidateQueries({ queryKey: ["help_articles_all"] });
    },
  });

  return {
    articles: query.data ?? EMPTY_ARTICLES,
    isLoading: query.isLoading,
    isLoaded: query.isSuccess,
    upsertArticle: upsertMutation.mutateAsync,
    deleteArticle: deleteMutation.mutateAsync,
    moveArticles: moveMutation.mutateAsync,
    patchArticle: patchMutation.mutateAsync,
    autosaveDraft: autosaveMutation.mutateAsync,
    discardDraft: discardDraftMutation.mutateAsync,
    saveContexts: contextsMutation.mutateAsync,
    supportsDrafts,
    refetchAll: allArticlesQuery.refetch,
    allArticles: allArticlesQuery.data ?? EMPTY_ARTICLES,
    fetchVersions: versionsQuery.mutateAsync,
    isFetchingVersions: versionsQuery.isPending,
    restoreVersion: restoreVersion.mutateAsync,
    isRestoringVersion: restoreVersion.isPending,
    canPublish,
  };
};
