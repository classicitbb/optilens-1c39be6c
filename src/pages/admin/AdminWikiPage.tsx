import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, LayoutTemplate } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import BlockEditor from "@/components/workspace/BlockEditor";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import WikiAssignmentsPanel from "@/components/admin/WikiAssignmentsPanel";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import WorkspaceRightPanel, { parsePanelTab, type PanelTab } from "@/components/workspace/WorkspaceRightPanel";
import { PageIdentity, PageTopBar, type Crumb } from "@/components/workspace/PageHeader";
import CommandPalette from "@/components/workspace/CommandPalette";
import MoveToDialog, { type MoveTarget } from "@/components/workspace/MoveToDialog";
import type { SearchDoc } from "@/components/workspace/paletteSearch";
import {
  ancestorsOf,
  descendantsOf,
  planPageMove,
  sectionIdOf,
  SECTION_PREFIX,
  isSectionId,
  type DropPosition,
  type TreePage,
} from "@/components/workspace/pageTreeLogic";
import { uniqueSlug, useHelpArticles, type AutosaveMeta, type HelpArticle } from "@/hooks/useHelpArticles";
import { useContentArticles } from "@/hooks/useContentArticles";
import { useWikiHeadings } from "@/hooks/useWikiHeadings";
import {
  useWikiExpanded,
  useWikiFavorites,
  useWikiPageMeta,
  useWikiSidebarState,
} from "@/hooks/useWikiWorkspacePrefs";
import {
  buildAdminHelpCenterTree,
  composeHelpEntrySummary,
  parseHelpEntrySummary,
  slugifyHelpValue,
  type HelpCenterNode,
} from "@/lib/helpCenter";
import { toAdminWikiArticlePath, toWikiArticleSlug } from "@/lib/wikiArticleRouting";
import { canonicalToSearchText, toCanonicalDocument, validateCanonicalDocument } from "@/lib/wikiCanonical";
import { validateWikiBuildVersionForPublish } from "@/lib/wikiReleaseMetadata";
import { canonicalBodyToMarkdown, canonicalToMarkdown } from "@/lib/wikiMarkdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type DraftForm = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  kind: "article" | "link";
  href: string;
  doc: BlogCanonicalContent;
  sectionId: string;
  parentId: string;
  sortOrder: string;
  status: "draft" | "published" | "archived";
  contextSlugs: string[];
};

const WIKI_HOME = "/admin/knowledge/wiki";

const EMPTY_FORM: DraftForm = {
  title: "",
  slug: "",
  summary: "",
  kind: "article",
  href: "",
  doc: { blocks: [] },
  sectionId: "",
  parentId: "none",
  sortOrder: "0",
  status: "draft",
  contextSlugs: ["knowledge/wiki"],
};

const buildDraftFromArticle = (article: HelpArticle): DraftForm => {
  const meta = parseHelpEntrySummary(article.summary);
  return {
    id: article.id,
    title: article.draft_title ?? article.title,
    slug: article.slug ?? slugifyHelpValue(article.title),
    summary: meta.summary,
    kind: meta.kind,
    href: meta.href ?? "",
    doc: article.draft_body_json ?? article.body_json ?? toCanonicalDocument(article.content),
    sectionId: article.section_id ?? "",
    parentId: article.parent_id ?? "none",
    sortOrder: String(article.sort_order ?? 0),
    status: article.status ?? "draft",
    contextSlugs: article.context_slugs?.length ? article.context_slugs : ["knowledge/wiki"],
  };
};

const toTreePage = (article: HelpArticle): TreePage => ({
  id: article.id,
  title: article.title,
  parent_id: article.parent_id ?? null,
  section_id: article.section_id ?? null,
  sort_order: article.sort_order ?? 0,
  status: article.status ?? "draft",
});

const FieldLabel = ({ children }: { children: string }) => <label className="ws-label block text-ws-ink-3">{children}</label>;

const AdminWikiPage = () => {
  const { articleSlug } = useParams<{ articleSlug?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { headings, createHeading } = useWikiHeadings();
  const {
    articles,
    isLoading,
    isLoaded,
    upsertArticle,
    restoreVersion,
    canPublish,
    moveArticles,
    patchArticle,
    autosaveDraft,
    discardDraft,
    saveContexts,
    supportsDrafts,
    refetchAll,
    allArticles,
  } = useHelpArticles("knowledge/wiki");
  const { articles: contentArticles } = useContentArticles();
  const { favoriteIds, isFavorite, toggleFavorite } = useWikiFavorites();
  const { pageMeta, patchPageMeta } = useWikiPageMeta();
  const { expanded: toggled, toggleExpanded } = useWikiExpanded();
  const sidebar = useWikiSidebarState();

  const [editorMode, setEditorMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<DraftForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  // Bumped whenever the draft is (re)loaded from the server so the block editor remounts with it.
  const [editorEpoch, setEditorEpoch] = useState(0);
  const loadedRef = useRef<{
    id?: string;
    version?: number;
    title?: string;
    status?: string;
    section?: string | null;
    parent?: string | null;
    sort?: number;
  }>({});

  const panelTab = parsePanelTab(searchParams.get("panel"));
  const showAssignments = searchParams.get("view") === "assignments";

  const visibleArticles = useMemo(() => articles.filter((article) => article.status !== "archived"), [articles]);
  const archivedArticles = useMemo(() => articles.filter((article) => article.status === "archived"), [articles]);
  const sidebarTree = useMemo(() => buildAdminHelpCenterTree(headings, visibleArticles), [headings, visibleArticles]);
  // Deep links must keep working for archived pages, so lookups use every article.
  const fullTree = useMemo(() => buildAdminHelpCenterTree(headings, articles), [articles, headings]);
  const treePages = useMemo(() => articles.map(toTreePage), [articles]);

  const selectedNode = articleSlug ? (fullTree.nodeBySlug.get(articleSlug) ?? null) : null;
  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedNode?.id) ?? null,
    [articles, selectedNode?.id],
  );

  // Unknown slug -> wiki home. Only once articles have actually loaded (the query
  // is disabled until permissions resolve), so deep links aren't bounced.
  useEffect(() => {
    if (articleSlug && isLoaded && !selectedNode) navigate(WIKI_HOME, { replace: true });
  }, [articleSlug, isLoaded, navigate, selectedNode]);

  // Load the draft when the page or its saved version changes. When the server copy changes
  // under the same version (autosave, rename, status, move) only the metadata that changed is
  // merged in, so a background refetch never wipes unsaved edits.
  useEffect(() => {
    if (!selectedArticle) {
      loadedRef.current = {};
      if (!articleSlug) {
        setEditorMode("view");
        setDraft(EMPTY_FORM);
      }
      return;
    }
    const prev = loadedRef.current;
    const samePage = prev.id === selectedArticle.id;
    loadedRef.current = {
      id: selectedArticle.id,
      version: selectedArticle.version_number,
      title: selectedArticle.draft_title ?? selectedArticle.title,
      status: selectedArticle.status,
      section: selectedArticle.section_id ?? null,
      parent: selectedArticle.parent_id ?? null,
      sort: selectedArticle.sort_order ?? 0,
    };

    if (!samePage || prev.version !== selectedArticle.version_number) {
      setDraft(buildDraftFromArticle(selectedArticle));
      if (!samePage) setEditorMode("view");
      setEditorEpoch((epoch) => epoch + 1);
      setSaveState("idle");
      return;
    }

    setDraft((current) => ({
      ...current,
      title: current.title === prev.title ? (selectedArticle.draft_title ?? selectedArticle.title) : current.title,
      status: prev.status !== selectedArticle.status ? (selectedArticle.status ?? current.status) : current.status,
      sectionId: prev.section !== (selectedArticle.section_id ?? null) ? (selectedArticle.section_id ?? "") : current.sectionId,
      parentId: prev.parent !== (selectedArticle.parent_id ?? null) ? (selectedArticle.parent_id ?? "none") : current.parentId,
      sortOrder: prev.sort !== (selectedArticle.sort_order ?? 0) ? String(selectedArticle.sort_order ?? 0) : current.sortOrder,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    articleSlug,
    selectedArticle?.id,
    selectedArticle?.version_number,
    selectedArticle?.updated_at,
    selectedArticle?.title,
    selectedArticle?.status,
    selectedArticle?.section_id,
    selectedArticle?.parent_id,
    selectedArticle?.sort_order,
  ]);

  const dirty = useMemo(
    () => Boolean(selectedArticle) && JSON.stringify(draft) !== JSON.stringify(buildDraftFromArticle(selectedArticle as HelpArticle)),
    [draft, selectedArticle],
  );

  // Autosave, 800 ms after the last change. What it writes depends on the page:
  //  - settings (summary, link target, section, parent, order, contexts) apply to the live page
  //    straight away, like a tree move; the slug too while the page is not published;
  //  - the body and title go to the live page for pages that are not published, and to the
  //    draft copy for published pages (so the public page only changes on Update);
  //  - a published page whose project has no draft-copy columns keeps body edits local.
  const saved = useMemo(() => (selectedArticle ? buildDraftFromArticle(selectedArticle) : null), [selectedArticle]);
  const isPublished = selectedArticle?.status === "published";
  const bodyRoute: "live" | "draft" | "local" = isPublished ? (supportsDrafts ? "draft" : "local") : "live";
  const bodyChanged = Boolean(saved) && draft.id === selectedArticle?.id && (draft.title !== saved!.title || JSON.stringify(draft.doc) !== JSON.stringify(saved!.doc));
  const metaChanged =
    Boolean(saved) &&
    (draft.summary !== saved!.summary ||
      draft.kind !== saved!.kind ||
      draft.href !== saved!.href ||
      draft.sectionId !== saved!.sectionId ||
      draft.parentId !== saved!.parentId ||
      draft.sortOrder !== saved!.sortOrder ||
      (!isPublished && draft.slug !== saved!.slug));
  const contextsChanged = Boolean(saved) && JSON.stringify(draft.contextSlugs) !== JSON.stringify(saved!.contextSlugs);
  // On the first render after opening a page the draft state is still empty; never compare or write then.
  const draftLoaded = draft.id !== undefined && draft.id === selectedArticle?.id;
  const writable = draftLoaded && ((bodyChanged && bodyRoute !== "local") || metaChanged || contextsChanged);
  const pendingAutosave = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    if (!selectedArticle || !writable) {
      pendingAutosave.current = null;
      setSaveState((state) => (state === "pending" ? "idle" : state));
      return;
    }
    const { id } = selectedArticle;
    const routeSlug = articleSlug;
    const run = async () => {
      setSaveState("saving");
      try {
        const writeBody = bodyChanged && bodyRoute !== "local";
        let meta: AutosaveMeta | undefined;
        let nextSlug: string | undefined;
        if (metaChanged) {
          meta = {
            summary: composeHelpEntrySummary({ kind: draft.kind, href: draft.href, summary: draft.summary }),
            section_id: draft.sectionId || null,
            parent_id: draft.parentId === "none" ? null : draft.parentId,
            sort_order: Number.parseInt(draft.sortOrder || "0", 10) || 0,
          };
          if (!isPublished) {
            nextSlug = uniqueSlug(
              slugifyHelpValue(draft.slug) || slugifyHelpValue(draft.title),
              articles.filter((article) => article.id !== id).map((article) => article.slug),
            );
            meta.slug = nextSlug;
          }
        }
        await autosaveDraft({
          id,
          ...(writeBody ? { title: draft.title.trim() || "Untitled", doc: draft.doc, asDraft: bodyRoute === "draft" } : {}),
          meta,
        });
        if (contextsChanged) await saveContexts({ id, slugs: draft.contextSlugs });
        setSaveState("saved");
        if (nextSlug && nextSlug !== draft.slug) setDraft((current) => ({ ...current, slug: nextSlug as string }));
        if (nextSlug && routeSlug && routeSlug !== nextSlug) {
          navigate(toAdminWikiArticlePath({ id, title: draft.title, slug: nextSlug }) + window.location.search, { replace: true });
        }
      } catch {
        setSaveState("error");
      }
    };
    setSaveState("pending");
    pendingAutosave.current = run;
    const timer = window.setTimeout(() => {
      pendingAutosave.current = null;
      void run();
    }, 800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, writable, selectedArticle?.id]);

  // Leaving the page (or this screen) with a change still waiting out its 800 ms writes it now.
  useEffect(
    () => () => {
      const flush = pendingAutosave.current;
      pendingAutosave.current = null;
      if (flush) void flush();
    },
    [selectedArticle?.id],
  );

  // Body edits that cannot be saved anywhere yet (published page, no draft copy): warn before leaving.
  const localOnlyEdits = bodyChanged && bodyRoute === "local";
  useEffect(() => {
    if (!localOnlyEdits) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [localOnlyEdits]);

  const hasUnpublishedDraft = Boolean(selectedArticle && isPublished && selectedArticle.draft_body_json);
  const saveLabel = !selectedArticle
    ? null
    : saveState === "saving" || saveState === "pending"
      ? "Saving…"
      : saveState === "error"
        ? "Autosave failed"
        : dirty
          ? "Unsaved changes"
          : hasUnpublishedDraft
            ? "Unpublished changes"
            : saveState === "saved"
              ? "Saved"
              : null;

  const discardUnpublished = async () => {
    if (!selectedArticle) return;
    try {
      await discardDraft(selectedArticle.id);
      setDraft(buildDraftFromArticle({ ...selectedArticle, draft_title: null, draft_body_json: null }));
      setEditorEpoch((epoch) => epoch + 1);
      setSaveState("idle");
      toast({ title: "Unpublished changes discarded" });
    } catch (error) {
      toast({ title: "Could not discard changes", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  };

  const setPanel = useCallback(
    (tab: PanelTab | null) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (tab) next.set("panel", tab);
          else next.delete("panel");
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  // Ctrl/⌘ K opens the palette, Ctrl/⌘ J opens Iris. Capture phase on window so
  // the admin top bar's own Ctrl+K handler (on document) does not also fire.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        event.stopPropagation();
        setPaletteOpen((open) => !open);
      } else if (key === "j") {
        event.preventDefault();
        event.stopPropagation();
        setPanel("iris");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [setPanel]);

  const ownerId = selectedArticle?.author_id ?? null;
  const { data: ownerName = null } = useQuery({
    queryKey: ["wiki_page_owner", ownerId],
    enabled: Boolean(ownerId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase.from("profiles") as any).select("full_name, display_name, email").eq("id", ownerId).maybeSingle();
      return (data?.full_name || data?.display_name || data?.email || null) as string | null;
    },
  });

  const openArticle = useCallback(
    (node: Pick<HelpCenterNode, "id" | "title" | "slug">) => navigate(toAdminWikiArticlePath(node)),
    [navigate],
  );

  const refreshAndOpen = async (slug: string, title: string) => {
    await queryClient.refetchQueries({ queryKey: ["help_articles"] });
    navigate(toAdminWikiArticlePath({ id: "article", title, slug }));
  };

  const createPage = async (placement: { parentId: string | null; sectionId: string | null }) => {
    const siblings = articles.filter(
      (article) =>
        (article.parent_id ?? null) === placement.parentId &&
        (placement.parentId !== null || (article.section_id ?? null) === placement.sectionId),
    );
    const slug = `untitled-${Date.now().toString(36)}`;
    try {
      await upsertArticle({
        title: "Untitled",
        slug,
        summary: composeHelpEntrySummary({ kind: "article", href: "", summary: "" }),
        content: "",
        category: headings.find((heading) => heading.id === placement.sectionId)?.slug ?? "general",
        page_slug: "knowledge/wiki",
        section_id: placement.sectionId,
        parent_id: placement.parentId,
        sort_order: siblings.reduce((max, article) => Math.max(max, article.sort_order ?? 0), -1) + 1,
        status: "draft",
        context_slugs: ["knowledge/wiki"],
      });
      if (placement.parentId) toggleExpanded(placement.parentId);
      await refreshAndOpen(slug, "Untitled");
      setEditorMode("edit");
    } catch (error) {
      toast({
        title: "Could not create page",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const addChildOf = (node: HelpCenterNode) => {
    if (isSectionId(node.id)) return createPage({ parentId: null, sectionId: sectionIdOf(node.id) });
    const article = articles.find((item) => item.id === node.id);
    return createPage({ parentId: node.id, sectionId: article?.section_id ?? null });
  };

  const handleCreateSection = async (title: string) => {
    try {
      await createHeading(title);
      toast({ title: "Section created" });
    } catch (error) {
      toast({
        title: "Could not create section",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const duplicatePage = async (id: string) => {
    const source = articles.find((article) => article.id === id);
    if (!source) return;
    const title = `Copy of ${source.title}`;
    const slug = `${slugifyHelpValue(title)}-${Date.now().toString(36)}`;
    try {
      await upsertArticle({
        title,
        slug,
        summary: source.summary ?? "",
        content: JSON.stringify(source.body_json ?? toCanonicalDocument(source.content)),
        category: source.category,
        page_slug: "knowledge/wiki",
        section_id: source.section_id ?? null,
        parent_id: source.parent_id ?? null,
        sort_order: (source.sort_order ?? 0) + 1,
        status: "draft",
        context_slugs: source.context_slugs,
        change_note: `Duplicated from ${source.title}`,
      });
      await refreshAndOpen(slug, title);
    } catch (error) {
      toast({
        title: "Could not duplicate page",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const movePage = async (dragId: string, targetId: string, position: DropPosition) => {
    const updates = planPageMove(treePages, dragId, targetId, position);
    if (updates === null) {
      toast({ title: "Can't move there", description: "A page can't be moved inside itself.", variant: "destructive" });
      return;
    }
    if (updates.length === 0) return;
    if (position === "inside") toggleExpanded(targetId, true);
    await moveArticles(updates).catch(() => undefined);
  };

  const archivePage = async (id: string) => {
    const page = articles.find((article) => article.id === id);
    await patchArticle({ id, status: "archived" });
    toast({ title: "Moved to trash", description: page?.title });
    if (id === selectedArticle?.id) navigate(WIKI_HOME);
  };

  const renamePage = async (id: string, title: string) => {
    await patchArticle({ id, title });
  };

  const saveArticle = async (nextStatus: DraftForm["status"]) => {
    if (!draft.title.trim()) {
      toast({ title: "Title required", description: "Add a title before saving.", variant: "destructive" });
      return;
    }

    if (draft.kind === "link" && !draft.href.trim()) {
      toast({ title: "Link target required", description: "Linked help entries need a target URL.", variant: "destructive" });
      return;
    }

    if (draft.kind === "article") {
      const validation = validateCanonicalDocument(draft.doc);
      if (!validation.valid) {
        toast({ title: "Cannot save article", description: validation.message, variant: "destructive" });
        return;
      }

      if (nextStatus === "published") {
        const buildValidation = validateWikiBuildVersionForPublish(canonicalBodyToMarkdown(draft.doc));
        if (!buildValidation.valid) {
          toast({ title: "Cannot publish", description: buildValidation.message, variant: "destructive" });
          return;
        }
      }
    }

    if (nextStatus === "published" && !canPublish) {
      toast({ title: "Publishing permission required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const slug = draft.slug.trim() || slugifyHelpValue(draft.title);
      const result = await upsertArticle({
        id: draft.id,
        version_number: selectedArticle?.version_number,
        title: draft.title.trim(),
        slug,
        summary: composeHelpEntrySummary({ kind: draft.kind, href: draft.href, summary: draft.summary }),
        content: JSON.stringify(draft.doc),
        category: headings.find((heading) => heading.id === draft.sectionId)?.slug ?? "general",
        page_slug: "knowledge/wiki",
        section_id: draft.sectionId || null,
        parent_id: draft.parentId === "none" ? null : draft.parentId,
        sort_order: Number.parseInt(draft.sortOrder || "0", 10) || 0,
        status: nextStatus,
        context_slugs: draft.contextSlugs.length > 0 ? draft.contextSlugs : ["knowledge/wiki"],
      });
      await refetchAll();
      toast({ title: nextStatus === "published" ? "Article published" : "Article saved" });
      if (result && result.historyRecorded === false) {
        toast({
          title: "Saved, but no version was recorded",
          description: "The version history table is missing on this project, so this change cannot be restored later.",
          variant: "destructive",
        });
      }
      setEditorMode("view");
      navigate(toAdminWikiArticlePath({ id: draft.id ?? "article", title: draft.title.trim(), slug }));
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Something went wrong while saving. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (status: "draft" | "archived") => {
    if (!selectedArticle) return;
    if (status === "archived") {
      await archivePage(selectedArticle.id);
      return;
    }
    await patchArticle({ id: selectedArticle.id, status });
    toast({ title: "Moved to draft" });
  };

  const exportMarkdown = () => {
    const markdown = canonicalToMarkdown(draft.title, draft.doc);
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.slug || slugifyHelpValue(draft.title) || "page"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sharePage = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy the link", variant: "destructive" });
    }
  };

  // Breadcrumbs: wiki > section > parents > page
  const crumbs = useMemo<Crumb[]>(() => {
    const list: Crumb[] = [{ label: "Internal wiki", to: WIKI_HOME }];
    if (!selectedArticle) return list;
    const section = headings.find((heading) => heading.id === selectedArticle.section_id);
    if (section) list.push({ label: section.title });
    for (const ancestor of ancestorsOf(treePages, selectedArticle.id)) {
      list.push({ label: ancestor.title || "Untitled", to: toAdminWikiArticlePath({ id: ancestor.id, title: ancestor.title, slug: articles.find((a) => a.id === ancestor.id)?.slug }) });
    }
    list.push({ label: draft.title || "Untitled" });
    return list;
  }, [articles, draft.title, headings, selectedArticle, treePages]);

  const paletteDocs = useMemo<SearchDoc[]>(() => {
    const pageIds = new Set(visibleArticles.map((article) => article.id));
    const pages: SearchDoc[] = visibleArticles.map((article) => ({
      id: article.id,
      title: article.title,
      body: canonicalToSearchText(article.body_json) || article.summary || "",
      kind: "page",
      meta: article.status,
    }));
    const website: SearchDoc[] = contentArticles
      .filter((article) => !pageIds.has(article.id) && article.is_active !== false)
      .map((article) => ({
        id: article.id,
        title: article.title,
        body: article.summary || article.description || "",
        kind: "website",
        meta: article.content_type,
      }));
    return [...pages, ...website];
  }, [contentArticles, visibleArticles]);

  const moveTargets = useMemo<MoveTarget[]>(() => {
    if (!moveTargetId) return [];
    const blocked = new Set([moveTargetId, ...descendantsOf(treePages, moveTargetId).map((page) => page.id)]);
    return [
      ...headings.map((heading) => ({ id: `${SECTION_PREFIX}${heading.id}`, label: heading.title, kind: "section" as const })),
      ...visibleArticles
        .filter((article) => !blocked.has(article.id))
        .map((article) => ({ id: article.id, label: article.title || "Untitled", kind: "page" as const })),
    ];
  }, [headings, moveTargetId, treePages, visibleArticles]);

  const moveTargetPage = articles.find((article) => article.id === moveTargetId);
  const editorPages = useMemo(
    () => visibleArticles.filter((article) => article.id !== selectedArticle?.id).map((article) => ({ id: article.id, title: article.title, slug: toWikiArticleSlug(article) })),
    [selectedArticle?.id, visibleArticles],
  );
  const searchPeople = useCallback(async (query: string) => {
    const term = query.replace(/[,()%*]/g, " ").trim();
    if (!term) return [];
    const { data } = await (supabase.from("profiles") as any)
      .select("id, full_name, display_name")
      .or(`full_name.ilike.%${term}%,display_name.ilike.%${term}%`)
      .limit(5);
    return ((data ?? []) as { id: string; full_name: string | null; display_name: string | null }[])
      .map((person) => ({ id: person.id, name: person.full_name || person.display_name || "" }))
      .filter((person) => person.name);
  }, []);
  const resolvePageHref = useCallback(
    (page: { id?: string; slug?: string; title: string }) =>
      page.slug ? toAdminWikiArticlePath({ id: page.id ?? "", title: page.title, slug: page.slug }) : undefined,
    [],
  );
  const meta = selectedArticle ? pageMeta[selectedArticle.id] : undefined;
  const fullWidth = meta?.fullWidth ?? false;
  const editing = editorMode === "edit";

  const settings = (
    <>
      <div className="space-y-1">
        <FieldLabel>Entry type</FieldLabel>
        <Select value={draft.kind} onValueChange={(value: DraftForm["kind"]) => setDraft((current) => ({ ...current, kind: value }))}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="article">Rendered article</SelectItem>
            <SelectItem value="link">Linked page</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {draft.kind === "link" ? (
        <div className="space-y-1">
          <FieldLabel>Link target</FieldLabel>
          <Input
            value={draft.href}
            onChange={(event) => setDraft((current) => ({ ...current, href: event.target.value }))}
            placeholder="/patients/progressive-lenses"
            className="h-9"
          />
        </div>
      ) : null}
      <div className="space-y-1">
        <FieldLabel>Slug</FieldLabel>
        <Input
          value={draft.slug}
          disabled={isPublished}
          onChange={(event) => setDraft((current) => ({ ...current, slug: slugifyHelpValue(event.target.value) }))}
          className="ws-mono h-9"
        />
        {isPublished ? <p className="text-[12px] text-ws-ink-3">Locked while published so existing links keep working.</p> : null}
      </div>
      <div className="space-y-1">
        <FieldLabel>Summary</FieldLabel>
        <Textarea
          value={draft.summary}
          onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
          placeholder="Short description shown in search and category lists."
          className="min-h-20"
        />
      </div>
      <div className="space-y-1">
        <FieldLabel>Section</FieldLabel>
        <Select
          value={draft.sectionId || "none"}
          onValueChange={(value) => setDraft((current) => ({ ...current, sectionId: value === "none" ? "" : value }))}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Choose a section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No section</SelectItem>
            {headings.map((heading) => (
              <SelectItem key={heading.id} value={heading.id}>
                {heading.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <FieldLabel>Parent page</FieldLabel>
        <Select value={draft.parentId} onValueChange={(value) => setDraft((current) => ({ ...current, parentId: value }))}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Top level</SelectItem>
            {articles
              .filter((article) => article.id !== draft.id)
              .map((article) => (
                <SelectItem key={article.id} value={article.id}>
                  {article.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <FieldLabel>Sort order</FieldLabel>
        <Input
          type="number"
          value={draft.sortOrder}
          onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))}
          className="h-9"
        />
      </div>
    </>
  );

  return (
    <>
      <WorkspaceShell
        sidebarWidth={sidebar.width}
        onSidebarWidthChange={sidebar.setWidth}
        sidebarCollapsed={sidebar.collapsed}
        onSidebarCollapsedChange={sidebar.setCollapsed}
        sidebar={
          <WorkspaceSidebar
            tree={{
              nodes: sidebarTree.sections,
              activeId: selectedNode?.id ?? null,
              toggled,
              onToggle: (id) => toggleExpanded(id),
              pageMeta,
              favoriteIds,
              onToggleFavorite: toggleFavorite,
              onOpen: openArticle,
              onAddChild: (node) => void addChildOf(node),
              onRename: (id, title) => void renamePage(id, title),
              onDuplicate: (id) => void duplicatePage(id),
              onMoveTo: setMoveTargetId,
              onArchive: (id) => void archivePage(id),
              onMove: (dragId, targetId, position) => void movePage(dragId, targetId, position),
              canEdit: true,
            }}
            articles={articles}
            archived={archivedArticles}
            userId={user?.id ?? null}
            onSearch={() => setPaletteOpen(true)}
            onAskIris={() => setPanel("iris")}
            onNewPage={() => void createPage({ parentId: null, sectionId: headings[0]?.id ?? null })}
            onRestore={(id) => void patchArticle({ id, status: "draft" })}
            onCollapse={() => sidebar.setCollapsed(true)}
            onCreateSection={handleCreateSection}
            onOpenAssignments={() => {
              setSearchParams({ view: "assignments" });
              if (articleSlug) navigate(`${WIKI_HOME}?view=assignments`);
            }}
          />
        }
        panel={
          panelTab ? (
            <WorkspaceRightPanel
              tab={panelTab}
              onTabChange={setPanel}
              onClose={() => setPanel(null)}
              articleId={selectedArticle?.id ?? null}
              canRestore={canPublish}
              onRestore={async (version) => {
                if (!selectedArticle) return;
                await restoreVersion({ articleId: selectedArticle.id, version });
                toast({ title: `Restored v${version.version_number}` });
              }}
            />
          ) : null
        }
      >
        <PageTopBar
          crumbs={showAssignments ? [{ label: "Internal wiki", to: WIKI_HOME }, { label: "Help assignments" }] : crumbs}
          editedAt={selectedArticle?.updated_at}
          insetLeft={sidebar.collapsed}
          editing={editing}
          dirty={dirty}
          saveLabel={saveLabel}
          isPublished={selectedArticle?.status === "published"}
          isSaving={isSaving}
          canPublish={canPublish}
          hasPage={Boolean(selectedArticle) && !showAssignments}
          irisOpen={panelTab === "iris"}
          fullWidth={fullWidth}
          isFavorite={selectedArticle ? isFavorite(selectedArticle.id) : false}
          onToggleEdit={() => setEditorMode(editing ? "view" : "edit")}
          onPublish={() => void saveArticle("published")}
          onShare={() => void sharePage()}
          onToggleIris={() => setPanel(panelTab === "iris" ? null : "iris")}
          onToggleFullWidth={() => selectedArticle && patchPageMeta(selectedArticle.id, { fullWidth: !fullWidth })}
          onToggleFavorite={() => selectedArticle && toggleFavorite(selectedArticle.id)}
          onDuplicate={() => selectedArticle && void duplicatePage(selectedArticle.id)}
          onExportMarkdown={exportMarkdown}
          onOpenHistory={() => setPanel("history")}
          onTrash={() => selectedArticle && void archivePage(selectedArticle.id)}
        />

        {showAssignments ? (
          <div className="h-[calc(100%-2.75rem)] min-h-0 px-4 pb-4">
            <WikiAssignmentsPanel articles={allArticles.length > 0 ? allArticles : articles} isLoading={isLoading} />
          </div>
        ) : selectedArticle ? (
          <>
            <PageIdentity
              icon={meta?.icon}
              cover={meta?.cover ?? false}
              title={draft.title}
              editable
              fullWidth={fullWidth}
              status={draft.status}
              kind={draft.kind}
              ownerName={ownerName}
              contextSlugs={draft.contextSlugs}
              updatedAt={selectedArticle.updated_at}
              versionNumber={selectedArticle.version_number}
              onTitleChange={(title) => {
                setEditorMode("edit");
                setDraft((current) => ({
                  ...current,
                  title,
                  slug:
                    // Only brand-new pages follow their title; an existing slug is never rewritten silently.
                    current.status !== "published" && (current.slug === "" || current.slug.startsWith("untitled-"))
                      ? slugifyHelpValue(title)
                      : current.slug,
                }));
              }}
              onIconChange={(icon) => patchPageMeta(selectedArticle.id, { icon })}
              onToggleCover={() => patchPageMeta(selectedArticle.id, { cover: !meta?.cover })}
              onStatusChange={(status) => void changeStatus(status)}
              onContextsChange={(contextSlugs) => setDraft((current) => ({ ...current, contextSlugs }))}
              settings={settings}
            />
            <div className={`mx-auto w-full px-6 pb-24 pt-6 sm:px-12 ${fullWidth ? "max-w-none" : "max-w-[720px]"}`}>
              {hasUnpublishedDraft ? (
                <div role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-[4px] border border-ws-line bg-ws-accent-tint px-3 py-2 text-[14px]">
                  <span className="flex-1">This page has unpublished changes. Visitors still see the published version.</span>
                  <button type="button" onClick={() => void saveArticle("published")} disabled={isSaving || !canPublish} className="rounded-[6px] bg-ws-accent px-3 py-1 text-[13px] font-semibold text-[hsl(var(--ws-accent-fg))] disabled:opacity-40">
                    Update
                  </button>
                  <button type="button" onClick={() => void discardUnpublished()} className="rounded-[6px] px-3 py-1 text-[13px] hover:bg-[var(--ws-hover)]">
                    Discard changes
                  </button>
                </div>
              ) : null}
              {isPublished && !supportsDrafts && bodyChanged ? (
                <div role="status" className="mb-4 rounded-[4px] border border-ws-line bg-ws-side px-3 py-2 text-[13px] text-ws-ink-2">
                  Edits to a published page stay in this browser until you choose Update. Saving them as a draft needs the draft-copy migration on this project.
                </div>
              ) : null}
              {draft.kind === "link" ? (
                <div className="space-y-2 border border-ws-line bg-ws-paper p-4">
                  <p className="ws-label text-ws-ink-3">Linked page</p>
                  <p className="break-all text-[14px] text-ws-ink-2">{draft.href || "Add a link target in Page settings."}</p>
                </div>
              ) : editing ? (
                <BlockEditor
                  key={`${selectedArticle.id}:${editorEpoch}`}
                  value={draft.doc}
                  onChange={(doc) => setDraft((current) => ({ ...current, doc }))}
                  pages={editorPages}
                  searchPeople={searchPeople}
                  onAskIris={() => setPanel("iris")}
                />
              ) : (
                <WikiArticleRenderer
                  bodyJson={draft.doc}
                  className="ws-prose mx-auto"
                  resolvePageHref={resolvePageHref}
                  emptyMessage="This page is empty. Choose Edit to start writing."
                />
              )}
            </div>
          </>
        ) : (
          <div className="mx-auto flex max-w-[560px] flex-col items-start gap-4 px-6 py-24 sm:px-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-ws-accent-tint text-ws-accent">
              <LayoutTemplate className="h-6 w-6" />
            </div>
            <h1 className="ws-h1">Write your team's SOPs in one place</h1>
            <p className="ws-body text-ws-ink-2">
              Pick a page from the sidebar, or start a new one. Published pages appear in Knowledge → SOPs.
            </p>
            <button
              type="button"
              onClick={() => void createPage({ parentId: null, sectionId: headings[0]?.id ?? null })}
              className="flex h-9 items-center gap-2 rounded-[6px] bg-ws-accent px-4 text-[14px] font-semibold text-[hsl(var(--ws-accent-fg))] hover:opacity-90"
            >
              <FilePlus2 className="h-4 w-4" /> New page
            </button>
          </div>
        )}
      </WorkspaceShell>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        docs={paletteDocs}
        onOpenDoc={(doc) => {
          if (doc.kind === "website") {
            navigate("/admin/website/content");
            return;
          }
          const article = articles.find((item) => item.id === doc.id);
          if (article) openArticle({ id: article.id, title: article.title, slug: article.slug });
        }}
        onNewPage={() => void createPage({ parentId: null, sectionId: headings[0]?.id ?? null })}
        onOpenWebsiteContent={() => navigate("/admin/website/content")}
        onAskIris={() => setPanel("iris")}
      />

      <MoveToDialog
        open={Boolean(moveTargetId)}
        pageTitle={moveTargetPage?.title || "page"}
        targets={moveTargets}
        onOpenChange={(open) => !open && setMoveTargetId(null)}
        onPick={(target) => {
          if (moveTargetId) void movePage(moveTargetId, target.id, "inside");
          setMoveTargetId(null);
        }}
      />
    </>
  );
};

export default AdminWikiPage;
