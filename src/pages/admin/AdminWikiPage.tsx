import { useEffect, useMemo, useState } from "react";
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
    await createHeading(creatingHeading);
    toast({ title: "Section created" });
    setCreatingHeading("");
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
        context_slugs: draft.contextSlugs,
      });
      await refetchAll();
      toast({ title: nextStatus === "published" ? "Article published" : "Article saved" });
      setEditorMode("view");
      setPreviewPublic(false);
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

  const renderTreeNode = (node: HelpCenterNode, depth = 0): JSX.Element => {
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
                CONTENT_PLACEHOLDER
              </div>
            </ScrollArea>
          </main>

          <aside className="min-h-0 rounded-[1.5rem] border border-border/60 bg-card/80">
            <ScrollArea className="h-full">
              <div className="space-y-5 p-5">
                INSPECTOR_PLACEHOLDER
              </div>
            </ScrollArea>
          </aside>
        </div>
      </TabsContent>

      <TabsContent value="assignments" className="mt-0 min-h-0 flex-1">
        <WikiAssignmentsPanel articles={allArticles} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
};

export default AdminWikiPage;
