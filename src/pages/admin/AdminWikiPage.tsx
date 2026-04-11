import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Eye,
  FilePlus2,
  FolderPlus,
  LayoutTemplate,
  ListTree,
  RefreshCw,
  Save,
  Search,
  Undo2,
  Upload,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import RichTextEditor from "@/components/admin/RichTextEditor";
import WikiAssignmentsPanel from "@/components/admin/WikiAssignmentsPanel";
import { useHelpArticles, type HelpArticle } from "@/hooks/useHelpArticles";
import { useWikiHeadings } from "@/hooks/useWikiHeadings";
import {
  buildAdminHelpCenterTree,
  composeHelpEntrySummary,
  parseHelpEntrySummary,
  slugifyHelpValue,
  toKnowledgeArticlePath,
  type HelpCenterNode,
} from "@/lib/helpCenter";
import { toAdminWikiArticlePath } from "@/lib/wikiArticleRouting";
import { toCanonicalDocument, validateCanonicalDocument } from "@/lib/wikiCanonical";
import { validateWikiBuildVersionForPublish } from "@/lib/wikiReleaseMetadata";
import { ADMIN_CONTEXT_OPTIONS } from "@/lib/adminContexts";
import { useToast } from "@/hooks/use-toast";

type EditorMode = "view" | "edit";

type DraftForm = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  kind: "article" | "link";
  href: string;
  content: string;
  sectionId: string;
  parentId: string;
  sortOrder: string;
  status: "draft" | "published" | "archived";
  contextSlugs: string[];
};

const EMPTY_FORM: DraftForm = {
  title: "",
  slug: "",
  summary: "",
  kind: "article",
  href: "",
  content: "",
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
    title: article.title,
    slug: article.slug ?? slugifyHelpValue(article.title),
    summary: meta.summary,
    kind: meta.kind,
    href: meta.href ?? "",
    content: article.content ?? "",
    sectionId: article.section_id ?? "",
    parentId: article.parent_id ?? "none",
    sortOrder: String(article.sort_order ?? 0),
    status: article.status ?? "draft",
    contextSlugs: article.context_slugs?.length ? article.context_slugs : ["knowledge/wiki"],
  };
};

const AdminWikiPage = () => {
  const { articleSlug } = useParams<{ articleSlug?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { headings, createHeading } = useWikiHeadings();
  const {
    articles,
    isLoading,
    upsertArticle,
    fetchVersions,
    restoreVersion,
    canPublish,
    refetchAll,
    allArticles,
    isFetchingVersions,
  } = useHelpArticles("knowledge/wiki");

  const [tab, setTab] = useState("docs");
  const [searchTerm, setSearchTerm] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("view");
  const [draft, setDraft] = useState<DraftForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [creatingHeading, setCreatingHeading] = useState("");
  const [previewPublic, setPreviewPublic] = useState(false);

  const tree = useMemo(() => buildAdminHelpCenterTree(headings, articles), [articles, headings]);
  const selectedNode = useMemo(
    () => (articleSlug ? tree.nodeBySlug.get(articleSlug) ?? null : null),
    [articleSlug, tree.nodeBySlug],
  );
  const selectedArticle = useMemo(
    () => articles.find((article) => article.id === selectedNode?.id) ?? null,
    [articles, selectedNode?.id],
  );

  useEffect(() => {
    if (!articleSlug) return;
    if (!selectedNode) {
      navigate("/admin/knowledge/wiki", { replace: true });
    }
  }, [articleSlug, navigate, selectedNode]);

  useEffect(() => {
    if (!selectedArticle) {
      if (!articleSlug) {
        setEditorMode("view");
        setDraft((prev) => ({ ...EMPTY_FORM, sectionId: headings[0]?.id ?? prev.sectionId }));
      }
      return;
    }

    setDraft(buildDraftFromArticle(selectedArticle));
    setEditorMode("view");
    setPreviewPublic(false);
  }, [articleSlug, headings, selectedArticle]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!normalizedSearch) return tree.sections;

    const filterNode = (node: HelpCenterNode): HelpCenterNode | null => {
      const matchesSelf = [node.title, node.summary, node.slug]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
      const filteredChildren = node.children
        .map(filterNode)
        .filter((child): child is HelpCenterNode => Boolean(child));

      if (matchesSelf || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }

      return null;
    };

    return tree.sections
      .map(filterNode)
      .filter((section): section is HelpCenterNode => Boolean(section));
  }, [normalizedSearch, tree.sections]);

  const parentCandidates = useMemo(
    () => articles.filter((article) => !draft.id || article.id !== draft.id),
    [articles, draft.id],
  );

  const beginNewArticle = () => {
    setDraft({
      ...EMPTY_FORM,
      sectionId: headings[0]?.id ?? "",
    });
    setEditorMode("edit");
    setPreviewPublic(false);
    navigate("/admin/knowledge/wiki", { replace: false });
  };

  const handleCreateHeading = async () => {
    if (!creatingHeading.trim()) return;
    try {
      await createHeading(creatingHeading);
      toast({ title: "Section created" });
      setCreatingHeading("");
    } catch (error) {
      toast({
        title: "Could not create section",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    }
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
      const canonical = toCanonicalDocument(draft.content);
      const validation = validateCanonicalDocument(canonical);
      if (!validation.valid) {
        toast({ title: "Cannot save article", description: validation.message, variant: "destructive" });
        return;
      }

      if (nextStatus === "published") {
        const buildValidation = validateWikiBuildVersionForPublish(draft.content);
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
      await upsertArticle({
        id: draft.id,
        title: draft.title.trim(),
        slug: draft.slug.trim() || slugifyHelpValue(draft.title),
        summary: composeHelpEntrySummary({
          kind: draft.kind,
          href: draft.href,
          summary: draft.summary,
        }),
        content: draft.content,
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
      setDraft((current) => ({ ...current, status: nextStatus }));
      setEditorMode("view");
      setPreviewPublic(false);
      navigate(
        toAdminWikiArticlePath({
          id: draft.id ?? "article",
          title: draft.title.trim(),
          slug: draft.slug.trim() || slugifyHelpValue(draft.title),
        }),
        { replace: false },
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollback = async () => {
    if (!draft.id) return;
    const versions = await fetchVersions(draft.id);
    const target = versions[1];
    if (!target) {
      toast({ title: "No previous version available" });
      return;
    }
    await restoreVersion({ articleId: draft.id, version: target });
    toast({ title: `Restored v${target.version_number}` });
  };

  const renderTreeNode = (node: HelpCenterNode, depth = 0): ReactElement => {
    const isArticle = node.kind !== "section";
    const isActive = selectedNode?.id === node.id;
    const paddingLeft = 12 + depth * 14;

    return (
      <div key={node.id} className="space-y-1">
        {isArticle ? (
          <button
            type="button"
            onClick={() => navigate(toAdminWikiArticlePath({ id: node.id, title: node.title, slug: node.slug }))}
            className="flex w-full items-center gap-2 rounded-xl py-2 pr-3 text-left transition-colors"
            style={{ paddingLeft }}
          >
            <span className={isActive ? "min-w-0 flex-1 truncate text-sm font-semibold text-foreground" : "min-w-0 flex-1 truncate text-sm text-muted-foreground"}>
              {node.title}
            </span>
            <Badge variant="outline" className="shrink-0">
              {node.kind === "link" ? "Link" : node.status}
            </Badge>
          </button>
        ) : (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            style={{ paddingLeft }}
          >
            <ListTree className="h-3.5 w-3.5" />
            <span>{node.title}</span>
          </div>
        )}

        {node.children.length > 0 ? (
          <div className="space-y-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const publicArticleHref = draft.slug.trim()
    ? toKnowledgeArticlePath(draft.slug.trim())
    : draft.title.trim()
      ? toKnowledgeArticlePath(slugifyHelpValue(draft.title))
      : "/knowledge";

  const selectedSection = headings.find((heading) => heading.id === draft.sectionId) ?? null;
  const assignmentArticles = allArticles.length > 0 ? allArticles : articles;
  const previewTitle = draft.title.trim() || "Untitled article";
  const previewSummary = draft.summary.trim();

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
      <div className="border-b border-border bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold tracking-tight">Knowledge CMS</p>
              <p className="text-xs text-muted-foreground">
                Shape the public help hierarchy, article content, and linked-topic coverage.
              </p>
            </div>
          </div>
          <TabsList className="h-9">
            <TabsTrigger value="docs">Docs CMS</TabsTrigger>
            <TabsTrigger value="assignments">Help Assignments</TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="docs" className="mt-0 min-h-0 flex-1">
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
          <aside className="min-h-0 rounded-[1.5rem] border border-border/60 bg-card/80">
            <div className="border-b border-border/60 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search docs or sections"
                  className="h-11 rounded-xl pl-9"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" onClick={beginNewArticle}>
                  <FilePlus2 data-icon="inline-start" />
                  New article
                </Button>
                <Button variant="outline" size="sm" onClick={handleCreateHeading}>
                  <FolderPlus data-icon="inline-start" />
                  Section
                </Button>
              </div>
              <Input
                value={creatingHeading}
                onChange={(event) => setCreatingHeading(event.target.value)}
                placeholder="Create a section heading"
                className="mt-2 h-9"
              />
            </div>
            <ScrollArea className="h-[calc(100%-10.5rem)]">
              <div className="space-y-3 p-3">
                {filteredSections.map((node) => renderTreeNode(node))}
              </div>
            </ScrollArea>
          </aside>

          <main className="min-h-0 rounded-[1.5rem] border border-border/60 bg-card/80">
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-4xl space-y-6 p-6">
                {!selectedArticle && editorMode === "view" ? (
                  <Card className="overflow-hidden border-border/60 bg-background/70 shadow-sm">
                    <CardContent className="space-y-6 p-8">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <LayoutTemplate className="h-6 w-6" />
                      </div>
                      <div className="space-y-3">
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                          Build the help center from one place
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                          Organize sections, connect related articles, publish polished help content,
                          and surface linked pages as first-class entries in the public knowledge base.
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Editorial IA
                          </p>
                          <p className="mt-2 text-sm text-foreground">
                            Section and parent-child relationships now drive the public docs structure.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Shared renderer
                          </p>
                          <p className="mt-2 text-sm text-foreground">
                            Preview and published help articles both use the same canonical wiki renderer.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Public ready
                          </p>
                          <p className="mt-2 text-sm text-foreground">
                            Linked pages and rich articles appear together in search, navigation, and browse flows.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={beginNewArticle}>
                          <FilePlus2 data-icon="inline-start" />
                          Start a new article
                        </Button>
                        <Button variant="outline" onClick={() => setEditorMode("edit")}>
                          <Eye data-icon="inline-start" />
                          Open editor
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          <span>Knowledge</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span>{selectedSection?.title ?? "Drafts"}</span>
                          {draft.parentId !== "none" ? (
                            <>
                              <ChevronRight className="h-3.5 w-3.5" />
                              <span>
                                {articles.find((article) => article.id === draft.parentId)?.title ?? "Parent"}
                              </span>
                            </>
                          ) : null}
                        </div>
                        <div>
                          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                            {previewTitle}
                          </h1>
                          {previewSummary ? (
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                              {previewSummary}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{draft.kind === "link" ? "Linked page" : draft.status}</Badge>
                          <Badge variant="secondary">
                            {selectedSection?.title ?? "Unassigned section"}
                          </Badge>
                          <Badge variant="secondary">
                            {draft.contextSlugs.length} context{draft.contextSlugs.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant={editorMode === "view" ? "secondary" : "outline"}
                          onClick={() => setEditorMode("view")}
                        >
                          <Eye data-icon="inline-start" />
                          Preview
                        </Button>
                        <Button
                          variant={editorMode === "edit" ? "secondary" : "outline"}
                          onClick={() => setEditorMode("edit")}
                        >
                          <Save data-icon="inline-start" />
                          Edit
                        </Button>
                        <Button variant="outline" asChild>
                          <a href={publicArticleHref} target="_blank" rel="noreferrer">
                            <ArrowUpRight data-icon="inline-start" />
                            Open public
                          </a>
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {editorMode === "edit" ? (
                      <div className="space-y-6">
                        <Card className="border-border/60 shadow-none">
                          <CardContent className="space-y-5 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Title</label>
                                <Input
                                  value={draft.title}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      title: event.target.value,
                                      slug:
                                        current.slug === "" ||
                                        current.slug === slugifyHelpValue(current.title)
                                          ? slugifyHelpValue(event.target.value)
                                          : current.slug,
                                    }))
                                  }
                                  placeholder="e.g. Understanding AR coatings"
                                  className="h-11 rounded-xl"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Slug</label>
                                <Input
                                  value={draft.slug}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      slug: slugifyHelpValue(event.target.value),
                                    }))
                                  }
                                  placeholder="understanding-ar-coatings"
                                  className="h-11 rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">Summary</label>
                              <Textarea
                                value={draft.summary}
                                onChange={(event) =>
                                  setDraft((current) => ({ ...current, summary: event.target.value }))
                                }
                                placeholder="Short description shown in search, category lists, and article headers."
                                className="min-h-24 rounded-2xl"
                              />
                            </div>

                            {draft.kind === "article" ? (
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Article body</label>
                                <RichTextEditor
                                  content={draft.content}
                                  onChange={(content) =>
                                    setDraft((current) => ({ ...current, content }))
                                  }
                                  placeholder="Write the help article using headings, lists, and links."
                                  minHeight="420px"
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Linked page notes</label>
                                <Textarea
                                  value={draft.content}
                                  onChange={(event) =>
                                    setDraft((current) => ({ ...current, content: event.target.value }))
                                  }
                                  placeholder="Optional internal notes about why this page is linked from the help center."
                                  className="min-h-40 rounded-2xl"
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <div className="flex flex-wrap items-center gap-3">
                          <Button onClick={() => void saveArticle("draft")} disabled={isSaving}>
                            <Save data-icon="inline-start" />
                            Save draft
                          </Button>
                          <Button
                            onClick={() => void saveArticle("published")}
                            disabled={isSaving || !canPublish}
                          >
                            <Upload data-icon="inline-start" />
                            Publish
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void handleRollback()}
                            disabled={!draft.id || isFetchingVersions}
                          >
                            <Undo2 data-icon="inline-start" />
                            Roll back
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (!selectedArticle) {
                                beginNewArticle();
                                return;
                              }
                              setDraft(buildDraftFromArticle(selectedArticle));
                              setEditorMode("view");
                              setPreviewPublic(false);
                            }}
                          >
                            <RefreshCw data-icon="inline-start" />
                            Reset changes
                          </Button>
                        </div>
                      </div>
                    ) : draft.kind === "article" ? (
                      <Card className="border-border/60 shadow-none">
                        <CardContent className="p-0">
                          <div className="border-b border-border/60 px-6 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  {previewPublic ? "Public help preview" : "Editorial preview"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  This preview uses the shared wiki renderer contract.
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewPublic((current) => !current)}
                              >
                                <Eye data-icon="inline-start" />
                                {previewPublic ? "Show editor preview" : "Show public framing"}
                              </Button>
                            </div>
                          </div>
                          <div className={previewPublic ? "bg-[#fbfaf6] px-6 py-8" : "px-6 py-8"}>
                            <WikiArticleRenderer
                              legacyContent={draft.content}
                              className="mx-auto max-w-3xl"
                              emptyMessage="This article is empty."
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-border/60 shadow-none">
                        <CardContent className="space-y-4 p-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Linked page preview
                          </p>
                          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                            {previewTitle}
                          </h2>
                          {previewSummary ? (
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                              {previewSummary}
                            </p>
                          ) : null}
                          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                            <p className="text-sm font-medium text-foreground">Destination</p>
                            <p className="mt-1 break-all text-sm text-muted-foreground">
                              {draft.href || "Add a target URL in the inspector."}
                            </p>
                          </div>
                          {draft.content ? (
                            <div className="rounded-2xl border border-border/60 bg-background p-4">
                              <p className="text-sm font-medium text-foreground">Internal notes</p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                {draft.content}
                              </p>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </main>

          <aside className="min-h-0 rounded-[1.5rem] border border-border/60 bg-card/80">
            <ScrollArea className="h-full">
              <div className="space-y-5 p-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold tracking-tight text-foreground">Inspector</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Control the article type, hierarchy, summary, visibility, and public destination from here.
                  </p>
                </div>

                <Card className="border-border/60 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Entry type
                      </label>
                      <Select
                        value={draft.kind}
                        onValueChange={(value: DraftForm["kind"]) =>
                          setDraft((current) => ({ ...current, kind: value }))
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Rendered article</SelectItem>
                          <SelectItem value="link">Linked page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Canonical route
                      </label>
                      <Input
                        value={publicArticleHref}
                        readOnly
                        className="h-10 rounded-xl bg-muted/30 text-xs"
                      />
                    </div>

                    {draft.kind === "link" ? (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Link target
                        </label>
                        <Input
                          value={draft.href}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, href: event.target.value }))
                          }
                          placeholder="/patients/progressive-lenses"
                          className="h-10 rounded-xl"
                        />
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Section
                      </label>
                      <Select
                        value={draft.sectionId || "none"}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            sectionId: value === "none" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl">
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

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Parent article
                      </label>
                      <Select
                        value={draft.parentId}
                        onValueChange={(value) =>
                          setDraft((current) => ({ ...current, parentId: value }))
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Top-level entry</SelectItem>
                          {parentCandidates.map((article) => (
                            <SelectItem key={article.id} value={article.id}>
                              {article.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Sort order
                        </label>
                        <Input
                          type="number"
                          value={draft.sortOrder}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, sortOrder: event.target.value }))
                          }
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Status
                        </label>
                        <Select
                          value={draft.status}
                          onValueChange={(value: DraftForm["status"]) =>
                            setDraft((current) => ({ ...current, status: value }))
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Visibility and contexts</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Choose where this entry participates in wiki navigation and help surfaces.
                        </p>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            Contexts
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 rounded-2xl p-3" align="end">
                          <div className="space-y-3">
                            {ADMIN_CONTEXT_OPTIONS.map((option) => {
                              const checked = draft.contextSlugs.includes(option.value);
                              return (
                                <label
                                  key={option.value}
                                  className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-muted/40"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(nextChecked) =>
                                      setDraft((current) => ({
                                        ...current,
                                        contextSlugs: nextChecked
                                          ? [...new Set([...current.contextSlugs, option.value])]
                                          : current.contextSlugs.filter((value) => value !== option.value),
                                      }))
                                    }
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                                    <p className="text-xs text-muted-foreground">{option.path}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {draft.contextSlugs.length > 0 ? (
                        draft.contextSlugs.map((slug) => {
                          const option = ADMIN_CONTEXT_OPTIONS.find((entry) => entry.value === slug);
                          return (
                            <Badge key={slug} variant="secondary">
                              {option?.label ?? slug}
                            </Badge>
                          );
                        })
                      ) : (
                        <Badge variant="outline">No contexts selected</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <p className="text-sm font-medium text-foreground">Publishing guardrails</p>
                    <div className="space-y-3 text-xs leading-5 text-muted-foreground">
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                        Article content is validated through the canonical wiki renderer before publish.
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                        Public knowledge entries use the same normalized hierarchy as the docs sidebar.
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                        {canPublish
                          ? "You can publish directly from this workspace."
                          : "You can save drafts here, but publishing still requires wiki publish permission."}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </aside>
        </div>
      </TabsContent>

      <TabsContent value="assignments" className="mt-0 min-h-0 flex-1">
        <WikiAssignmentsPanel articles={assignmentArticles} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
};

export default AdminWikiPage;
