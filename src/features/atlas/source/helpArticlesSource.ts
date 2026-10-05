import { supabase } from "@/integrations/supabase/client";
import { canonicalToHtml, canonicalToSearchText, toCanonicalDocument } from "@/lib/wikiCanonical";
import { composeHelpEntrySummary, parseHelpEntrySummary } from "@/lib/helpCenter";
import { buildAutosaveUpdate } from "@/hooks/useHelpArticles";
import { searchDocs, type SearchDoc } from "./searchRank";
import type {
  AtlasHit,
  AtlasListing,
  AtlasPage,
  AtlasProps,
  AtlasSection,
  AtlasSource,
  AtlasStatus,
  AtlasVersion,
  AutosaveInput,
  NewPageInput,
  PlacementMove,
  PublishInput,
} from "./types";

/**
 * The only module that knows pages are rows of `help_articles`. Spaces are the stored `space`
 * column when it exists, otherwise derived from `content_type`, so nothing breaks if the column
 * has not been applied to a project yet.
 */

const SPACE_BY_CONTENT_TYPE: Record<string, string> = { knowledge: "website", faq: "website", legal: "website" };
export const deriveStoredSpace = (row: { space?: string | null; content_type?: string | null }): string =>
  row.space || SPACE_BY_CONTENT_TYPE[row.content_type ?? ""] || "wiki";

/** Stored column values a new page gets, per space. Unknown spaces store like the first one. */
const SPACE_STORE_DEFAULTS: Record<string, { content_type: string; visibility: string; page_slug: string; contexts: string[] }> = {
  wiki: { content_type: "wiki", visibility: "internal", page_slug: "knowledge/wiki", contexts: ["knowledge/wiki"] },
  website: { content_type: "knowledge", visibility: "public", page_slug: "knowledge", contexts: [] },
};
const storeDefaults = (spaceId: string) => SPACE_STORE_DEFAULTS[spaceId] ?? SPACE_STORE_DEFAULTS.wiki;

/** Property key -> column. Properties are schema-driven per space; this is the storage mapping. */
const PROP_COLUMNS: Record<string, string> = {
  visibility: "visibility",
  contentType: "content_type",
  category: "category",
  description: "description",
  pageSlug: "page_slug",
  active: "is_active",
};

const propsToColumns = (props: AtlasProps | undefined): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    const column = PROP_COLUMNS[key];
    if (column && value !== undefined) out[column] = value;
  }
  return out;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Row {
  [key: string]: any;
}

const toPage = (row: Row): AtlasPage => {
  const contexts: string[] = [...new Set<string>((row.help_article_contexts ?? []).map((c: Row) => c.context_slug).filter(Boolean))];
  const meta = parseHelpEntrySummary(row.summary);
  const canonical = toCanonicalDocument(row.body_json ?? row.content);
  const inactive = row.is_active === false;
  const stored: AtlasStatus = row.status ?? "published";
  return {
    id: row.id,
    title: row.title,
    slug: row.slug ?? null,
    spaceId: deriveStoredSpace(row),
    // An inactive row that was "published" in the old content manager is not live: show it as a draft.
    status: inactive && stored === "published" ? "draft" : stored,
    entryKind: meta.kind,
    href: meta.href ?? "",
    summary: meta.summary,
    doc: canonical,
    draftTitle: row.draft_title ?? null,
    draftDoc: row.draft_body_json ? toCanonicalDocument(row.draft_body_json) : null,
    draftSavedAt: row.draft_saved_at ?? null,
    parentId: row.parent_id ?? null,
    sectionId: row.section_id ?? null,
    sortOrder: row.sort_order ?? 0,
    contexts: contexts.length > 0 ? contexts : [row.page_slug || "all"],
    props: {
      visibility: row.visibility ?? null,
      contentType: row.content_type ?? null,
      category: row.category ?? "",
      description: row.description ?? "",
      pageSlug: row.page_slug ?? "",
      active: row.is_active !== false,
    },
    authorId: row.author_id ?? null,
    lastEditedBy: row.last_edited_by ?? null,
    version: row.version_number ?? 1,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const missingTable = (error: unknown) => {
  const code = (error as { code?: string })?.code;
  return code === "PGRST205" || code === "42P01";
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export interface HelpArticlesSourceOptions {
  /** Wiki-space rows are only readable where the caller may view one of their contexts. */
  canViewContext: (slug: string) => boolean;
}

export const createHelpArticlesSource = ({ canViewContext }: HelpArticlesSourceOptions): AtlasSource => {
  let drafts = false;
  let spaceColumn = false;

  const readable = (row: Row): boolean => {
    if (deriveStoredSpace(row) !== "wiki") return true;
    const slugs: string[] = (row.help_article_contexts ?? []).map((c: Row) => c.context_slug).filter(Boolean);
    return (slugs.length > 0 ? slugs : [row.page_slug || "all"]).some(canViewContext);
  };

  const snapshot = async (id: string, title: string, doc: AtlasPage["doc"], version: number, note?: string) => {
    const { error } = await (supabase as any).from("help_article_versions").insert({
      article_id: id,
      title_snapshot: title,
      body_snapshot: doc,
      change_note: note ?? null,
      version_number: version,
    });
    if (error) {
      // The history table may be missing on a project that has not applied the migration. The page
      // itself is saved, so report "history not recorded" instead of a failed save.
      if (missingTable(error)) return false;
      throw error;
    }
    return true;
  };

  const writeContexts = async (id: string, slugs: string[]) => {
    const contexts = [...new Set(slugs.filter(Boolean))];
    if (contexts.length === 0) return;
    const { error: deleteError } = await (supabase.from("help_article_contexts") as any).delete().eq("article_id", id);
    if (deleteError) throw deleteError;
    const { error } = await (supabase.from("help_article_contexts") as any).insert(contexts.map((context_slug) => ({ article_id: id, context_slug })));
    if (error) throw error;
  };

  return {
    id: "help_articles",

    async listPages(): Promise<AtlasListing> {
      const { data, error } = await (supabase.from("help_articles") as any).select("*, help_article_contexts(context_slug)").order("sort_order");
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      drafts = rows.some((row) => "draft_body_json" in row);
      spaceColumn = rows.some((row) => "space" in row);
      return { pages: rows.filter(readable).map(toPage), supportsDrafts: drafts };
    },

    async listSections(): Promise<AtlasSection[]> {
      const { data, error } = await (supabase as any).from("wiki_headings").select("*").eq("is_active", true).order("sort_order").order("title");
      if (error) throw error;
      return ((data ?? []) as Row[]).map((row) => ({ id: row.id, slug: row.slug, title: row.title, sortOrder: row.sort_order ?? 0 }));
    },

    async createSection(title: string) {
      const trimmed = title.trim();
      const slug = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (!slug) throw new Error("Section title is required");
      const { data: existing, error: existingError } = await (supabase as any).from("wiki_headings").select("id").eq("slug", slug).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return;
      const { error } = await (supabase as any).from("wiki_headings").insert({ title: trimmed, slug });
      if (error) throw error;
    },

    async renameSection(id, title) {
      const trimmed = title.trim();
      if (!trimmed) throw new Error("Section title is required");
      const { error } = await (supabase as any).from("wiki_headings").update({ title: trimmed }).eq("id", id);
      if (error) throw error;
    },

    async deleteSection(id) {
      const { error } = await (supabase as any).from("wiki_headings").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },

    async createPage(input: NewPageInput) {
      const defaults = storeDefaults(input.spaceId);
      const doc = input.doc ?? { blocks: [] };
      const html = canonicalToHtml(doc);
      const status = input.status ?? "draft";
      const props = { ...input.props };
      const payload: Record<string, unknown> = {
        title: input.title,
        content: html,
        body_json: doc,
        body_html: html,
        page_slug: defaults.page_slug,
        content_type: defaults.content_type,
        visibility: defaults.visibility,
        sort_order: input.sortOrder ?? 0,
        category: "",
        slug: input.slug,
        summary: composeHelpEntrySummary({ kind: input.entryKind ?? "article", href: input.href ?? "", summary: input.summary ?? "" }),
        section_id: input.sectionId ?? null,
        parent_id: input.parentId ?? null,
        status,
        version_number: 1,
        published_at: status === "published" ? new Date().toISOString() : null,
        ...propsToColumns(props),
        ...(spaceColumn ? { space: input.spaceId } : {}),
      };
      const { data, error } = await (supabase as any).from("help_articles").insert(payload).select("id").single();
      if (error) throw error;
      const contexts = input.contexts && input.contexts.length > 0 ? input.contexts : defaults.contexts;
      await writeContexts(data.id, contexts);
      return { id: data.id as string, historyRecorded: await snapshot(data.id, input.title, doc, 1, input.changeNote ?? "Initial draft") };
    },

    async autosave(input: AutosaveInput) {
      const meta = input.meta;
      const update = buildAutosaveUpdate({
        id: input.id,
        title: input.title,
        doc: input.doc,
        asDraft: input.asDraft,
        supportsDrafts: drafts,
        meta: meta
          ? {
              ...(meta.summary !== undefined ? { summary: composeHelpEntrySummary({ kind: meta.entryKind ?? "article", href: meta.href ?? "", summary: meta.summary }) } : {}),
              ...(meta.sectionId !== undefined ? { section_id: meta.sectionId } : {}),
              ...(meta.parentId !== undefined ? { parent_id: meta.parentId } : {}),
              ...(meta.sortOrder !== undefined ? { sort_order: meta.sortOrder } : {}),
              ...(meta.slug !== undefined ? { slug: meta.slug } : {}),
              ...propsToColumns(meta.props),
            }
          : undefined,
      });
      if (Object.keys(update).length === 0) return;
      const { error } = await (supabase.from("help_articles") as any).update(update).eq("id", input.id);
      if (error) throw error;
    },

    async saveVersion(input: PublishInput) {
      if (!UUID_RE.test(input.id)) throw new Error("Only saved pages can be versioned.");
      const html = canonicalToHtml(input.doc);
      const next = input.version + 1;
      const payload: Record<string, unknown> = {
        title: input.title,
        content: html,
        body_json: input.doc,
        body_html: html,
        ...(input.slug ? { slug: input.slug } : {}),
        summary: composeHelpEntrySummary({ kind: input.entryKind, href: input.href, summary: input.summary }),
        section_id: input.sectionId,
        parent_id: input.parentId,
        sort_order: input.sortOrder,
        status: input.status,
        version_number: next,
        published_at: input.status === "published" ? new Date().toISOString() : null,
        ...propsToColumns(input.props),
        // Publishing makes a page live: the legacy `is_active` switch must agree with `status`.
        ...(input.status === "published" ? { is_active: true } : {}),
        ...(drafts ? { draft_title: null, draft_body_json: null, draft_saved_at: null } : {}),
      };
      const { error } = await (supabase as any).from("help_articles").update(payload).eq("id", input.id);
      if (error) throw error;
      if (input.contexts.length > 0) await writeContexts(input.id, input.contexts);
      return { historyRecorded: await snapshot(input.id, input.title, input.doc, next, input.changeNote) };
    },

    async discardDraft(id: string) {
      const { error } = await (supabase.from("help_articles") as any).update({ draft_title: null, draft_body_json: null, draft_saved_at: null }).eq("id", id);
      if (error) throw error;
    },

    async movePages(updates: PlacementMove[]) {
      const results = await Promise.all(updates.map(({ id, ...placement }) => (supabase.from("help_articles") as any).update(placement).eq("id", id)));
      const failed = results.find((result: { error: unknown }) => result.error);
      if (failed) throw failed.error;
    },

    async patchPage(id, patch) {
      const update: Record<string, unknown> = { ...propsToColumns(patch.props) };
      if (patch.title !== undefined) update.title = patch.title;
      if (patch.status !== undefined) {
        update.status = patch.status;
        if (patch.status === "published") update.is_active = true;
      }
      if (Object.keys(update).length === 0) return;
      const { error } = await (supabase.from("help_articles") as any).update(update).eq("id", id);
      if (error) throw error;
    },

    async setContexts(id, slugs) {
      await writeContexts(id, slugs);
    },

    async removePage(id) {
      const { error } = await (supabase.from("help_articles") as any).delete().eq("id", id);
      if (error) throw error;
    },

    async listVersions(id): Promise<AtlasVersion[]> {
      const { data, error } = await (supabase as any).from("help_article_versions").select("*").eq("article_id", id).order("version_number", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Row[]).map((row) => ({
        id: row.version_id,
        pageId: row.article_id,
        number: row.version_number,
        title: row.title_snapshot,
        doc: toCanonicalDocument(row.body_snapshot),
        savedAt: row.saved_at,
        savedBy: row.saved_by ?? null,
        note: row.change_note ?? null,
      }));
    },

    async restoreVersion(id, version) {
      const { data: current, error: fetchError } = await (supabase as any).from("help_articles").select("version_number").eq("id", id).single();
      if (fetchError) throw fetchError;
      const next = ((current as Row)?.version_number ?? 1) + 1;
      const html = canonicalToHtml(version.doc);
      const { error } = await (supabase.from("help_articles") as any)
        .update({
          title: version.title,
          body_json: version.doc,
          content: html,
          body_html: html,
          version_number: next,
          ...(drafts ? { draft_title: null, draft_body_json: null, draft_saved_at: null } : {}),
        })
        .eq("id", id);
      if (error) throw error;
      await snapshot(id, version.title, version.doc, next, `Rollback to v${version.number}`);
    },

    async searchPeople(query) {
      const term = query.replace(/[,()%*]/g, " ").trim();
      if (!term) return [];
      const { data } = await (supabase.from("profiles") as any)
        .select("id, full_name, display_name")
        .or(`full_name.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(5);
      return ((data ?? []) as Row[])
        .map((person) => ({ id: person.id as string, name: (person.full_name || person.display_name || "") as string }))
        .filter((person) => person.name);
    },

    async personName(id) {
      const { data } = await (supabase.from("profiles") as any).select("full_name, display_name, email").eq("id", id).maybeSingle();
      return ((data?.full_name || data?.display_name || data?.email || null) as string | null) ?? null;
    },

    async search(query, options): Promise<AtlasHit[]> {
      const terms = query
        .toLowerCase()
        .replace(/[,()%*\\]/g, " ")
        .split(/\s+/)
        .filter((term) => term.length > 1);
      if (terms.length === 0) return [];
      // Candidates come from the longest term (it is the most selective); every term is then
      // required in the ranker below, so multi-word searches behave like the old palette.
      const lead = [...terms].sort((a, b) => b.length - a.length)[0];
      const { data, error } = await (supabase.from("help_articles") as any)
        .select("id, title, slug, summary, description, content, body_json, status, is_active, content_type, page_slug, space, help_article_contexts(context_slug)")
        .or(`title.ilike.%${lead}%,summary.ilike.%${lead}%,description.ilike.%${lead}%,content.ilike.%${lead}%`)
        .limit(80);
      if (error) throw error;
      const docs: SearchDoc[] = [];
      for (const row of (data ?? []) as Row[]) {
        if (!readable(row)) continue;
        const spaceId = deriveStoredSpace(row);
        if (options?.spaceIds && !options.spaceIds.includes(spaceId)) continue;
        const body = row.body_json ? canonicalToSearchText(toCanonicalDocument(row.body_json)) : stripHtml(row.content ?? "");
        docs.push({
          id: row.id,
          title: row.title,
          body: [row.summary, row.description, body].filter(Boolean).join(" "),
          spaceId,
          slug: row.slug ?? null,
          status: row.is_active === false && (row.status ?? "published") === "published" ? "draft" : (row.status ?? "published"),
        });
      }
      return searchDocs(docs, terms.join(" "), options?.limit ?? 30).map((hit) => ({
        pageId: hit.id,
        spaceId: hit.spaceId,
        title: hit.title,
        slug: hit.slug ?? null,
        status: (hit.status ?? "published") as AtlasStatus,
        snippet: hit.snippet ?? hit.body.slice(0, 140),
        rank: hit.score,
      }));
    },
  };
};
