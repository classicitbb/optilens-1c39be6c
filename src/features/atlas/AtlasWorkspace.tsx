import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2, LayoutTemplate } from "lucide-react";
import type { Editor } from "@tiptap/core";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { canonicalToMarkdown } from "@/lib/wikiMarkdown";
import { canonicalToSearchText, canonicalToTiptapDoc } from "@/lib/wikiCanonical";
import { slugifyHelpValue } from "@/lib/helpCenter";
import { ATLAS_CONFIG, atlasPath } from "./config";
import { getAtlasHost, useAtlasWorkspaceName } from "./host";
import { useStandaloneDisplay } from "./hooks/useStandaloneDisplay";
import { defaultPropsFor, getAtlasSpace, homeSpaceFor, listAtlasSpaces, type AtlasSpaceDef } from "./spaces";
import IrisPanel, { type IrisProposal, type IrisRequest } from "./iris/IrisPanel";
import ImportDryRunDialog from "./import/ImportDryRunDialog";
import { buildSpaceExport, zipFiles } from "./exportSpace";
import { buildTree, toPageSlug } from "./pageTree";
import { useAtlasCapabilities, useAtlasData, usePagesInSpace } from "./hooks/useAtlas";
import { usePageEditor } from "./hooks/usePageEditor";
import { useAtlasExpanded, useAtlasFavorites, useAtlasPageMeta, useAtlasSidebarState } from "./hooks/useAtlasPrefs";
import WorkspaceShell from "./components/WorkspaceShell";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import WorkspaceRightPanel, { parsePanelTab, type PanelTab } from "./components/WorkspaceRightPanel";
import { PageIdentity, PageTopBar, type Crumb } from "./components/PageHeader";
import CommandPalette, { type PaletteAction } from "./components/CommandPalette";
import MoveToDialog, { type MoveTarget } from "./components/MoveToDialog";
import AssignmentsPanel from "./components/AssignmentsPanel";
import PageBody from "./components/PageBody";
import PagePasswordSetting from "./components/PagePasswordSetting";
import { isPageUnlocked, usePageUnlocked, useUnlockVersion } from "./lock";
import PropertiesForm from "./components/PropertiesForm";
import {
  ancestorsOf,
  descendantsOf,
  planPageMove,
  sectionIdOf,
  SECTION_PREFIX,
  isSectionId,
  type DropPosition,
  type TreePage,
} from "./components/pageTreeLogic";
import type { TreeNode } from "./pageTree";
import type { AtlasHit, AtlasPage } from "./source/types";
import type { AskIrisRequest } from "./components/editor/extensions";

const DatabaseSpace = lazy(() => import("./database/DatabaseSpace"));

const toTreePage = (page: AtlasPage): TreePage => ({
  id: page.id,
  title: page.title,
  parent_id: page.parentId,
  section_id: page.sectionId,
  sort_order: page.sortOrder,
  status: page.status,
});

interface AtlasWorkspaceProps {
  space: AtlasSpaceDef;
  articleSlug?: string;
}

/**
 * One shell for every space. A tree space (Wiki, SOPs) shows a page tree; a database space
 * (Website) shows saved views and Table / Board / Gallery. Both open pages in the same editor.
 */
const AtlasWorkspace = ({ space, articleSlug }: AtlasWorkspaceProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const workspaceName = useAtlasWorkspaceName();
  const standalone = useStandaloneDisplay();
  const LauncherFavorite = getAtlasHost().LauncherFavorite;
  const data = useAtlasData();
  const { bySpace } = useAtlasCapabilities();
  const caps = bySpace[space.id];
  const { pages: allPages, sections, isLoading, isLoaded } = data;

  const { favoriteIds, isFavorite, toggleFavorite } = useAtlasFavorites();
  const { pageMeta, patchPageMeta } = useAtlasPageMeta();
  const { expanded: toggled, toggleExpanded } = useAtlasExpanded();
  const sidebar = useAtlasSidebarState();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);

  const panelTab = parsePanelTab(searchParams.get("panel"));
  const showAssignments = searchParams.get("view") === "assignments" && space.layout === "tree";
  const isTree = space.layout === "tree";
  const base = (...rest: string[]) => atlasPath(space.id, ...rest);

  const spacePages = usePagesInSpace(space, allPages);
  const visiblePages = useMemo(() => spacePages.filter((page) => page.status !== "archived"), [spacePages]);
  const archivedPages = useMemo(() => (space.scope.statuses ? [] : spacePages.filter((page) => page.status === "archived")), [space.scope.statuses, spacePages]);
  const visibleTree = useMemo(() => buildTree(sections, visiblePages), [sections, visiblePages]);
  // A password-protected page that is still locked in this tab hides its subpages from the sidebar.
  const unlockVersion = useUnlockVersion();
  const lockedIds = useMemo(
    () => new Set(spacePages.filter((page) => !isPageUnlocked(page.id, page.doc.lock)).map((page) => page.id)),
    [spacePages, unlockVersion], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const sidebarNodes = useMemo(() => {
    const prune = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((node) => (lockedIds.has(node.id) ? { ...node, children: [] } : { ...node, children: prune(node.children) }));
    return prune(visibleTree.roots);
  }, [lockedIds, visibleTree.roots]);
  // Deep links must keep working for archived pages, so lookups use every page in the space.
  const fullTree = useMemo(() => buildTree(sections, spacePages), [sections, spacePages]);
  const treePages = useMemo(() => spacePages.map(toTreePage), [spacePages]);

  // While a page's slug is being renamed, the URL and the page list briefly disagree about it. The
  // page stays pinned by id until they agree again, so it is never mistaken for an unknown page.
  const [transition, setTransition] = useState<{ id: string; slug: string } | null>(null);
  const bySlugNode = articleSlug ? (fullTree.nodeBySlug.get(articleSlug) ?? null) : null;
  const requestedId = searchParams.get("articleId");
  const selectedNode = (requestedId ? fullTree.nodeById.get(requestedId) : null)
    ?? bySlugNode ?? (articleSlug && transition ? (fullTree.nodeById.get(transition.id) ?? null) : null);
  useEffect(() => {
    if (transition && bySlugNode?.id === transition.id && bySlugNode.slug === transition.slug) setTransition(null);
  }, [bySlugNode?.id, transition]);
  const selectedPage = useMemo(() => spacePages.find((page) => page.id === selectedNode?.id) ?? null, [spacePages, selectedNode?.id]);
  useEffect(() => {
    const previous = document.title;
    document.title = selectedPage ? `${selectedPage.title || "Untitled"} | ${ATLAS_CONFIG.productName}` : `${space.label} | ${ATLAS_CONFIG.productName}`;
    return () => { document.title = previous; };
  }, [selectedPage?.title, space.label]);

  const spaces = useMemo(() => listAtlasSpaces().filter((candidate) => bySpace[candidate.id]?.view), [bySpace]);

  // A slug that is not in this space but is in another one the user can read (an old wiki URL for
  // a website page, an SOP URL for a draft) goes to where the page lives. Unknown slugs go to the
  // space home. Only once pages have actually loaded, so deep links are not bounced.
  useEffect(() => {
    if (!articleSlug || !isLoaded || selectedNode || data.isFetching || searchParams.get("articleId")) return;
    const elsewhere = allPages.find((page) => toPageSlug(page) === articleSlug);
    const home = elsewhere ? homeSpaceFor(elsewhere.spaceId) : undefined;
    if (elsewhere && home && home.id !== space.id && bySpace[home.id]?.view) {
      navigate(atlasPath(home.id, articleSlug) + window.location.search, { replace: true });
      return;
    }
    navigate(base(), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleSlug, isLoaded, selectedNode, allPages, data.isFetching]);

  // Old links that carry only an id (the site's "Edit" buttons) resolve to a slug URL here.
  const legacyId = searchParams.get("articleId");
  useEffect(() => {
    if (!legacyId || !isLoaded) return;
    const match = allPages.find((page) => page.id === legacyId);
    const home = match ? homeSpaceFor(match.spaceId) : undefined;
    if (match && home) {
      const target = atlasPath(home.id, toPageSlug(match));
      if (window.location.pathname !== target) navigate(target + `?articleId=${encodeURIComponent(match.id)}`, { replace: true });
    }
    else
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete("articleId");
          return next;
        },
        { replace: true },
      );
  }, [allPages, isLoaded, legacyId, navigate, setSearchParams]);

  const canEdit = Boolean(caps?.edit);
  const canPublish = Boolean(caps?.publish);
  const canCreate = canEdit && space.allowCreate;

  // A page the user just created opens ready to type in.
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const editor = usePageEditor({
    page: selectedPage,
    pages: allPages,
    data,
    canEdit,
    canPublish,
    routeSlug: articleSlug,
    initialMode: articleSlug && articleSlug === createdSlug ? "edit" : "view",
    onSlugChanging: (slug) => selectedPage && setTransition({ id: selectedPage.id, slug }),
    // The page list must know the new slug before the URL does, or the page looks unknown and the user is bounced home.
    onSlugChanged: async (slug) => {
      if (selectedPage) setTransition({ id: selectedPage.id, slug });
      await data.refresh();
      const params = new URLSearchParams(window.location.search);
      if (selectedPage) params.set("articleId", selectedPage.id);
      navigate(base(slug) + `?${params}`, { replace: true });
    },
    onSaved: (slug) => {
      const params = new URLSearchParams(window.location.search);
      if (selectedPage) params.set("articleId", selectedPage.id);
      navigate(base(slug) + `?${params}`, { replace: true });
    },
  });
  const { draft, setDraft, mode, setMode } = editor;

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

  // Iris: any entry point (⌘J, sidebar, selection, "/" menu, block menu) opens the panel, optionally with a request.
  const [irisRequest, setIrisRequest] = useState<IrisRequest | null>(null);
  const editorInstance = useRef<Editor | null>(null);
  const openIris = useCallback(
    (request?: AskIrisRequest) => {
      setIrisRequest(request ? { ...request, nonce: Date.now() } : null);
      setPanel("iris");
    },
    [setPanel],
  );

  // Ctrl/⌘ K opens the palette, Ctrl/⌘ J opens Iris. Capture phase on window so another shell's own
  // Ctrl+K handler (on document) does not also fire.
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
        openIris();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [openIris, setPanel]);

  const ownerId = selectedPage?.authorId ?? null;
  const { data: ownerName = null } = useQuery({
    queryKey: ["atlas", "owner", ownerId],
    enabled: Boolean(ownerId),
    staleTime: 5 * 60 * 1000,
    queryFn: () => data.source.personName(ownerId as string),
  });

  const pagePath = useCallback((page: Pick<AtlasPage, "id" | "title" | "slug">) => base(toPageSlug(page)), [space.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const openNode = useCallback((node: Pick<TreeNode, "slug">) => {
    const page = spacePages.find((candidate) => toPageSlug(candidate) === node.slug);
    navigate(base(node.slug) + (page ? `?articleId=${encodeURIComponent(page.id)}` : ""));
  }, [space.id, navigate, spacePages]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionSlug = (sectionId: string | null) => sections.find((section) => section.id === sectionId)?.slug ?? "general";

  const createPage = useCallback(
    async (placement: { parentId: string | null; sectionId: string | null }) => {
      if (!canCreate) return;
      const siblings = spacePages.filter(
        (page) => page.parentId === placement.parentId && (placement.parentId !== null || page.sectionId === placement.sectionId),
      );
      const slug = `untitled-${Date.now().toString(36)}`;
      try {
        await data.createPage({
          spaceId: space.scope.storeSpace,
          title: "Untitled",
          slug,
          sectionId: placement.sectionId,
          parentId: placement.parentId,
          sortOrder: siblings.reduce((max, page) => Math.max(max, page.sortOrder), -1) + 1,
          status: "draft",
          props: isTree ? { category: sectionSlug(placement.sectionId) } : defaultPropsFor(space),
        });
        if (placement.parentId) toggleExpanded(placement.parentId);
        setCreatedSlug(slug);
        navigate(base(slug));
      } catch (error) {
        toast({ title: "Could not create page", description: error instanceof Error ? error.message : "Try again in a moment.", variant: "destructive" });
      }
    },
    [canCreate, data, isTree, navigate, setMode, space, spacePages, toast, toggleExpanded], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const newPageDefault = useCallback(() => createPage({ parentId: null, sectionId: isTree ? (sections[0]?.id ?? null) : null }), [createPage, isTree, sections]);

  // Launcher shortcuts and links: ?new=1 starts a page, ?search=1 opens the palette.
  useEffect(() => {
    if (!isLoaded) return;
    const wantsNew = searchParams.get("new") === "1";
    const wantsSearch = searchParams.get("search") === "1";
    if (!wantsNew && !wantsSearch) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("new");
        next.delete("search");
        return next;
      },
      { replace: true },
    );
    if (wantsSearch) setPaletteOpen(true);
    if (wantsNew) void newPageDefault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, searchParams]);

  const addChildOf = (node: TreeNode) => {
    if (isSectionId(node.id)) return createPage({ parentId: null, sectionId: sectionIdOf(node.id) });
    const page = spacePages.find((item) => item.id === node.id);
    return createPage({ parentId: node.id, sectionId: page?.sectionId ?? null });
  };

  const deleteSection = async (nodeId: string) => {
    if (!canEdit) return;
    const section = sections.find((item) => item.id === sectionIdOf(nodeId));
    const count = spacePages.filter((page) => page.sectionId === section?.id).length;
    const detail = count > 0 ? ` Its ${count} ${count === 1 ? "page stays" : "pages stay"} and move to the top level.` : "";
    if (!window.confirm(`Delete the section “${section?.title ?? "section"}”?${detail}`)) return;
    try {
      await data.deleteSection(sectionIdOf(nodeId));
      toast({ title: "Section deleted", description: section?.title });
    } catch {
      /* the mutation already reported the failure */
    }
  };

  const handleCreateSection = async (title: string) => {
    try {
      await data.createSection(title);
      toast({ title: "Section created" });
    } catch (error) {
      toast({ title: "Could not create section", description: error instanceof Error ? error.message : "Try again in a moment.", variant: "destructive" });
    }
  };

  const duplicatePage = async (id: string) => {
    const source = spacePages.find((page) => page.id === id);
    if (!source || !canCreate) return;
    const title = `Copy of ${source.title}`;
    const slug = `${slugifyHelpValue(title)}-${Date.now().toString(36)}`;
    try {
      await data.createPage({
        spaceId: source.spaceId,
        title,
        slug,
        summary: source.summary,
        entryKind: source.entryKind,
        href: source.href,
        doc: source.doc,
        sectionId: source.sectionId,
        parentId: source.parentId,
        sortOrder: source.sortOrder + 1,
        status: "draft",
        contexts: source.contexts,
        props: { ...source.props },
        changeNote: `Duplicated from ${source.title}`,
      });
      navigate(base(slug));
    } catch (error) {
      toast({ title: "Could not duplicate page", description: error instanceof Error ? error.message : "Try again in a moment.", variant: "destructive" });
    }
  };

  const movePage = async (dragId: string, targetId: string, position: DropPosition) => {
    if (!canEdit) return;
    if (position === "inside" && lockedIds.has(targetId)) {
      toast({ title: "Unlock the page first", description: "Enter its password before moving a page inside it.", variant: "destructive" });
      return;
    }
    const updates = planPageMove(treePages, dragId, targetId, position);
    if (updates === null) {
      toast({ title: "Can't move there", description: "A page can't be moved inside itself.", variant: "destructive" });
      return;
    }
    if (updates.length === 0) return;
    if (position === "inside") toggleExpanded(targetId, true);
    await data.movePages(updates).catch(() => undefined);
  };

  const archivePage = async (id: string) => {
    if (!canEdit) return;
    const page = spacePages.find((item) => item.id === id);
    await data.patchPage({ id, status: "archived" });
    toast({ title: "Moved to trash", description: page?.title });
    if (id === selectedPage?.id) navigate(base());
  };

  const changeStatus = async (status: "draft" | "archived") => {
    if (!selectedPage) return;
    if (status === "archived") {
      await archivePage(selectedPage.id);
      return;
    }
    await data.patchPage({ id: selectedPage.id, status });
    toast({ title: "Moved to draft" });
  };

  const pageUnlocked = usePageUnlocked(selectedPage?.id, draft.doc.lock);

  const exportMarkdown = () => {
    if (!pageUnlocked) {
      toast({ title: "Unlock the page to export it", variant: "destructive" });
      return;
    }
    const markdown = canonicalToMarkdown(draft.title, draft.doc);
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.slug || slugifyHelpValue(draft.title) || "page"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /** Every page of this space as Markdown and canonical JSON in one zip, so content can always leave Atlas. */
  const exportSpace = () => {
    const files = buildSpaceExport(space.label, spacePages, sections);
    const url = URL.createObjectURL(new Blob([zipFiles(files) as BlobPart], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${space.id}-export.zip`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: `${spacePages.length} pages` });
  };

  const sharePage = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${selectedPage ? `?articleId=${encodeURIComponent(selectedPage.id)}` : ""}`);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy the link", variant: "destructive" });
    }
  };

  const crumbs = useMemo<Crumb[]>(() => {
    const list: Crumb[] = [{ label: space.label, to: base() }];
    if (!selectedPage) return list;
    const section = sections.find((item) => item.id === selectedPage.sectionId);
    if (section) list.push({ label: section.title });
    for (const ancestor of ancestorsOf(treePages, selectedPage.id)) {
      list.push({ label: ancestor.title || "Untitled", to: base(toPageSlug(spacePages.find((page) => page.id === ancestor.id) ?? { id: ancestor.id, title: ancestor.title, slug: null })) });
    }
    list.push({ label: draft.title || "Untitled" });
    return list;
  }, [draft.title, sections, selectedPage, space.id, space.label, spacePages, treePages]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveTargets = useMemo<MoveTarget[]>(() => {
    if (!moveTargetId) return [];
    const blocked = new Set([moveTargetId, ...descendantsOf(treePages, moveTargetId).map((page) => page.id)]);
    return [
      ...sections.map((section) => ({ id: `${SECTION_PREFIX}${section.id}`, label: section.title, kind: "section" as const })),
      ...visiblePages.filter((page) => !blocked.has(page.id)).map((page) => ({ id: page.id, label: page.title || "Untitled", kind: "page" as const })),
    ];
  }, [moveTargetId, sections, treePages, visiblePages]);
  const moveTargetPage = spacePages.find((page) => page.id === moveTargetId);

  const editorPages = useMemo(
    () => visiblePages.filter((page) => page.id !== selectedPage?.id).map((page) => ({ id: page.id, title: page.title, slug: toPageSlug(page) })),
    [selectedPage?.id, visiblePages],
  );
  const searchPeople = useCallback((query: string) => data.source.searchPeople(query), [data.source]);
  const resolvePageHref = useCallback(
    (page: { id?: string; slug?: string; title: string }) => (page.slug ? base(page.slug) : undefined),
    [space.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const meta = selectedPage ? pageMeta[selectedPage.id] : undefined;
  const fullWidth = meta?.fullWidth ?? false;
  const editing = mode === "edit" && canEdit;

  const dynamicOptions = useMemo(
    () => ({
      sections: sections.map((section) => ({ value: section.id, label: section.title })),
      pages: spacePages.filter((page) => page.id !== selectedPage?.id).map((page) => ({ value: page.id, label: page.title })),
    }),
    [sections, selectedPage?.id, spacePages],
  );

  const settings = (
    <>
      <PropertiesForm
        properties={space.properties.filter((property) => property.type !== "contexts")}
        draft={draft}
        onChange={setDraft}
        published={editor.isPublished}
        disabled={!canEdit}
        dynamicOptions={dynamicOptions}
      />
      {selectedPage ? (
        <PagePasswordSetting
          pageId={selectedPage.id}
          doc={draft.doc}
          disabled={!canEdit}
          onDocChange={(update) => setDraft((current) => ({ ...current, doc: update(current.doc) }))}
        />
      ) : null}
    </>
  );

  const paletteActions = useMemo<PaletteAction[]>(
    () => [
      ...(canCreate ? [{ id: "new", label: "New page", icon: <FilePlus2 className="h-4 w-4" />, run: () => void newPageDefault() }] : []),
      ...spaces
        .filter((candidate) => candidate.id !== space.id)
        .map((candidate) => ({ id: `open-${candidate.id}`, label: `Open ${candidate.label}`, icon: <candidate.icon className="h-4 w-4" />, run: () => navigate(atlasPath(candidate.id)) })),
      { id: "iris", label: "Ask Iris", icon: <span aria-hidden>✦</span>, run: () => openIris() },
      { id: "export", label: `Export ${space.label} (.zip)`, icon: <span aria-hidden>⇩</span>, run: exportSpace },
      ...(canEdit ? [{ id: "import", label: "Import dry run…", icon: <span aria-hidden>⇪</span>, run: () => setImportOpen(true) }] : []),
    ],
    [canCreate, canEdit, navigate, newPageDefault, openIris, space.id, spaces],
  );

  const visibleSpaceIds = useMemo(() => [...new Set(spaces.map((candidate) => candidate.scope.storeSpace))], [spaces]);

  const irisHitPath = useCallback(
    (hit: AtlasHit) => atlasPath(homeSpaceFor(hit.spaceId)?.id ?? space.id, toPageSlug({ id: hit.pageId, title: hit.title, slug: hit.slug })),
    [space.id],
  );

  // A drafted page from Iris starts titled after the question once the new page has loaded.
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  useEffect(() => {
    if (pendingTitle && selectedPage && draft.id === selectedPage.id && draft.title === "Untitled") {
      setDraft((current) => ({ ...current, title: pendingTitle }));
      setPendingTitle(null);
    }
  }, [draft.id, draft.title, pendingTitle, selectedPage, setDraft]);

  /** Apply an accepted Iris proposal to the open page (draft only; Publish is still the user's call). */
  const acceptProposal = (proposal: IrisProposal): boolean => {
    if (!selectedPage || !canEdit) return false;
    const content = canonicalToTiptapDoc({ blocks: proposal.blocks }).content ?? [];
    const live = editing ? editorInstance.current : null;
    if (live) {
      try {
        if (proposal.apply === "replace" && proposal.range) {
          const replacement = content.length === 1 && content[0].type === "paragraph" ? content[0].content ?? [] : content;
          live.chain().focus().insertContentAt(proposal.range, replacement).run();
          return true;
        }
        if (proposal.apply === "insertAfter" && proposal.range) {
          live.chain().focus().insertContentAt(live.state.doc.resolve(proposal.range.to).after(1), content).run();
          return true;
        }
        live.chain().focus("end").insertContent(content).run();
        return true;
      } catch {
        // The selection moved since Iris was asked: add the text at the end instead of losing it.
        live.chain().focus("end").insertContent(content).run();
        return true;
      }
    }
    editor.applyDoc({ blocks: [...draft.doc.blocks, ...proposal.blocks] });
    return true;
  };

  /** Accepting a drafted entry creates a draft page in the target space. Nothing is published. */
  const draftEntry = async (proposal: IrisProposal) => {
    const target = proposal.actionId ? space.draftTargets?.[proposal.actionId] : undefined;
    const targetSpace = getAtlasSpace(target?.spaceId);
    if (!target || !targetSpace || !bySpace[targetSpace.id]?.edit) {
      toast({ title: "You can't create drafts there", variant: "destructive" });
      return;
    }
    const view = targetSpace.savedViews.find((candidate) => candidate.id === target.savedViewId);
    try {
      await data.createPage({
        spaceId: targetSpace.scope.storeSpace,
        title: proposal.heading || "Untitled",
        slug: `untitled-${Date.now().toString(36)}`,
        doc: { blocks: proposal.blocks.slice(1) },
        status: "draft",
        props: defaultPropsFor(targetSpace, view),
        changeNote: "Drafted with Iris",
      });
      toast({ title: `Draft created in ${targetSpace.label}`, description: proposal.heading });
    } catch (error) {
      toast({ title: "Could not create the draft", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  };

  const showList = space.layout === "database" && !articleSlug;

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
              nodes: sidebarNodes,
              activeId: selectedNode?.id ?? null,
              toggled,
              onToggle: (id) => toggleExpanded(id),
              pageMeta,
              favoriteIds,
              onToggleFavorite: toggleFavorite,
              onOpen: openNode,
              onAddChild: (node) => void addChildOf(node),
              onRename: (id, title) => {
                if (isSectionId(id)) { void data.renameSection({ id: sectionIdOf(id), title }); return; }
                if (id === selectedPage?.id) setTransition({ id, slug: "" });
                void data.patchPage({ id, title }).then(async () => {
                  const listing = await data.source.listPages();
                  const renamed = listing.pages.find((page) => page.id === id);
                  if (renamed && id === selectedPage?.id) {
                    setTransition({ id, slug: toPageSlug(renamed) });
                    navigate(base(toPageSlug(renamed)) + `?articleId=${encodeURIComponent(id)}`, { replace: true });
                  }
                }).catch(() => setTransition(null));
              },
              onDeleteSection: (id) => void deleteSection(id),
              onDuplicate: (id) => void duplicatePage(id),
              onMoveTo: setMoveTargetId,
              onArchive: (id) => void archivePage(id),
              onMove: (dragId, targetId, position) => void movePage(dragId, targetId, position),
              canEdit,
            }}
            articles={spacePages}
            archived={archivedPages}
            userId={user?.id ?? null}
            brand={{ productName: ATLAS_CONFIG.productName, workspaceName }}
            space={space}
            spaces={spaces}
            onSelectSpace={(id) => navigate(atlasPath(id))}
            canCreate={canCreate}
            canEdit={canEdit}
            pagePath={pagePath}
            showAssignments={isTree}
            showTree={isTree}
            appLinks={standalone ? getAtlasHost().appLinks : undefined}
            onSearch={() => setPaletteOpen(true)}
            onAskIris={() => openIris()}
            onNewPage={() => void newPageDefault()}
            onRestore={(id) => void data.patchPage({ id, status: "draft" })}
            onCollapse={() => sidebar.setCollapsed(true)}
            onCreateSection={handleCreateSection}
            onOpenAssignments={() => navigate(`${base()}?view=assignments`)}
          />
        }
        panel={
          panelTab ? (
            <WorkspaceRightPanel
              tab={panelTab}
              onTabChange={setPanel}
              onClose={() => setPanel(null)}
              articleId={selectedPage?.id ?? null}
              canRestore={canPublish}
              iris={
                <IrisPanel
                  request={irisRequest}
                  page={selectedPage ? { id: selectedPage.id, title: draft.title, text: canonicalToSearchText(draft.doc) } : null}
                  search={(query) => data.source.search(query, { spaceIds: visibleSpaceIds, limit: 6 })}
                  pageText={(id) => canonicalToSearchText(allPages.find((candidate) => candidate.id === id)?.doc)}
                  pagePath={irisHitPath}
                  route={window.location.pathname}
                  canEdit={canEdit}
                  onAccept={acceptProposal}
                  onDraftEntry={draftEntry}
                  onDraftPage={async (title) => {
                    await createPage({ parentId: null, sectionId: isTree ? (sections[0]?.id ?? null) : null });
                    setPendingTitle(title);
                  }}
                />
              }
              loadVersions={(id) => data.source.listVersions(id)}
              onRestore={async (version) => {
                if (!selectedPage) return;
                await data.restoreVersion({ id: selectedPage.id, version });
                toast({ title: `Restored v${version.number}` });
              }}
            />
          ) : null
        }
      >
        <PageTopBar
          crumbs={showAssignments ? [{ label: space.label, to: base() }, { label: "Assignments" }] : crumbs}
          editedAt={selectedPage?.updatedAt}
          insetLeft={sidebar.collapsed}
          editing={editing}
          dirty={editor.dirty}
          saveLabel={editor.saveLabel}
          isPublished={selectedPage?.status === "published"}
          isSaving={editor.isSaving}
          canPublish={canPublish}
          canEdit={canEdit}
          hasPage={Boolean(selectedPage) && !showAssignments}
          irisOpen={panelTab === "iris"}
          fullWidth={fullWidth}
          isFavorite={selectedPage ? isFavorite(selectedPage.id) : false}
          onToggleEdit={() => setMode(editing ? "view" : "edit")}
          onPublish={() => void editor.saveAs("published")}
          onShare={() => void sharePage()}
          onToggleIris={() => setPanel(panelTab === "iris" ? null : "iris")}
          onToggleFullWidth={() => selectedPage && patchPageMeta(selectedPage.id, { fullWidth: !fullWidth })}
          onToggleFavorite={() => selectedPage && toggleFavorite(selectedPage.id)}
          launcherFavorite={selectedPage && LauncherFavorite ? <LauncherFavorite page={selectedPage} /> : null}
          onDuplicate={() => selectedPage && void duplicatePage(selectedPage.id)}
          onExportMarkdown={exportMarkdown}
          onOpenHistory={() => setPanel("history")}
          onTrash={() => selectedPage && void archivePage(selectedPage.id)}
        />

        {showAssignments ? (
          <div className="h-[calc(100%-2.75rem)] min-h-0 px-4 pb-4">
            <AssignmentsPanel articles={spacePages} isLoading={isLoading} />
          </div>
        ) : showList ? (
          <Suspense fallback={<p className="px-6 py-8 text-[14px] text-ws-ink-3">Loading…</p>}>
            <DatabaseSpace
              space={space}
              data={data}
              spacePages={spacePages}
              capabilities={caps}
              onAskIris={() => openIris()}
              dynamicOptions={dynamicOptions}
              editorPages={editorPages}
              searchPeople={searchPeople}
              resolvePageHref={resolvePageHref}
              supportsDrafts={data.supportsDrafts}
            />
          </Suspense>
        ) : selectedPage ? (
          <>
            <PageIdentity
              icon={meta?.icon}
              cover={meta?.cover ?? false}
              title={draft.title}
              editable={canEdit}
              fullWidth={fullWidth}
              status={draft.status}
              kind={draft.entryKind}
              ownerName={ownerName}
              contextSlugs={draft.contexts}
              updatedAt={selectedPage.updatedAt}
              versionNumber={selectedPage.version}
              onTitleChange={(title) => {
                setMode("edit");
                setDraft((current) => ({
                  ...current,
                  title,
                }));
              }}
              onIconChange={(icon) => patchPageMeta(selectedPage.id, { icon })}
              onToggleCover={() => patchPageMeta(selectedPage.id, { cover: !meta?.cover })}
              onStatusChange={(status) => void changeStatus(status)}
              onContextsChange={(contexts) => setDraft((current) => ({ ...current, contexts }))}
              settings={settings}
            />
            <div className={`mx-auto w-full px-6 pb-24 pt-6 sm:px-12 ${fullWidth ? "max-w-none" : "max-w-[720px]"}`}>
              <PageBody
                page={selectedPage}
                editor={editor}
                editing={editing}
                canPublish={canPublish}
                supportsDrafts={data.supportsDrafts}
                pages={editorPages}
                searchPeople={searchPeople}
                resolvePageHref={resolvePageHref}
                onAskIris={openIris}
                onEditor={(instance) => {
                  editorInstance.current = instance;
                }}
                onUpdate={() => void editor.saveAs("published")}
              />
            </div>
          </>
        ) : (
          <div className="mx-auto flex max-w-[560px] flex-col items-start gap-4 px-6 py-24 sm:px-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-ws-accent-tint text-ws-accent">
              <LayoutTemplate className="h-6 w-6" />
            </div>
            <h1 className="ws-h1">{space.label}</h1>
            <p className="ws-body text-ws-ink-2">
              {space.description} {canCreate ? "Pick a page from the sidebar, or start a new one." : "Pick a page from the sidebar."}
            </p>
            {canCreate ? (
              <button
                type="button"
                onClick={() => void newPageDefault()}
                className="flex h-9 items-center gap-2 rounded-[6px] bg-ws-accent px-4 text-[14px] font-semibold text-[hsl(var(--ws-accent-fg))] hover:opacity-90"
              >
                <FilePlus2 className="h-4 w-4" /> New page
              </button>
            ) : null}
          </div>
        )}
      </WorkspaceShell>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        search={async (query) => {
          const hits = await data.source.search(query, { spaceIds: visibleSpaceIds });
          return hits;
        }}
        spaceLabel={(storeSpace) => homeSpaceFor(storeSpace)?.label ?? storeSpace}
        onOpenHit={(hit) => {
          const home = homeSpaceFor(hit.spaceId);
          const page = allPages.find((candidate) => candidate.id === hit.pageId);
          const slug = page ? toPageSlug(page) : hit.slug;
          if (home && slug) navigate(atlasPath(home.id, slug));
        }}
        actions={paletteActions}
        placeholder="Search pages and text…"
      />

      <ImportDryRunDialog open={importOpen} onOpenChange={setImportOpen} existingSlugs={allPages.map((page) => page.slug)} />

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

export default AtlasWorkspace;
