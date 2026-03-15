import { useState, useEffect, lazy, Suspense, useMemo, useRef } from "react";
import { X, BookOpen, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import HelpFeedbackButtons from "./HelpFeedbackButtons";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { getContextLabel } from "@/lib/adminContexts";
import { useWikiHeadings } from "@/hooks/useWikiHeadings";
import { canViewContextSlug, canViewWikiCategory } from "@/lib/wikiPermissions";
import type { WikiCategory } from "@/data/wikiContent";
import WikiArticleRenderer from "./WikiArticleRenderer";

const WikiArticleEditDialog = lazy(() => import("./WikiArticleEditDialog"));

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  currentSlug: string;
}

const CATEGORY_DEFAULT_CONTEXT: Record<string, string> = {
  "release-ledger": "knowledge/wiki",
  "getting-started": "knowledge/wiki",
  "pricing-app": "pricing/catalog",
  "sales-app": "sales/proposals",
  "contacts-app": "contacts",
  "leads-app": "leads/finder",
  "crm-app": "crm/dashboard",
  "helpdesk-app": "helpdesk/tickets",
  "website-app": "website/content",
  "moonshot-app": "moonshot/dashboard",
  "knowledge-app": "knowledge/wiki",
  "settings-app": "settings/company",
};

const HelpPanel = ({ open, onClose, currentSlug }: HelpPanelProps) => {
  const { articles, isLoading } = useHelpArticles(currentSlug);
  const { headings } = useWikiHeadings();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [width, setWidth] = useState(380);
  const [resizing, setResizing] = useState(false);
  const { canEdit } = useAdminRole();
  const { canView } = useRolePermissions();
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [staticWikiCategories, setStaticWikiCategories] = useState<WikiCategory[]>([]);

  useEffect(() => {
    let active = true;

    const loadStaticWiki = async () => {
      const module = await import("@/data/wikiContent");
      if (active) {
        setStaticWikiCategories(module.wikiCategories);
      }
    };

    void loadStaticWiki();

    return () => {
      active = false;
    };
  }, []);

  const staticArticles = useMemo(() => {
    return staticWikiCategories
      .filter((category) => canViewWikiCategory(category.id, canView))
      .flatMap((category) =>
        category.articles.map((article) => {
          const contexts = article.context_slugs?.length
            ? article.context_slugs
            : [CATEGORY_DEFAULT_CONTEXT[category.id] ?? "knowledge/wiki"];

          return {
            id: `static:${article.id}`,
            sourceArticleId: article.id,
            title: article.title,
            content: article.content,
            page_slug: contexts[0] ?? "knowledge/wiki",
            context_slugs: contexts,
            sort_order: 0,
          };
        })
      )
      .filter(
        (article) =>
          article.context_slugs.some((contextSlug) => canViewContextSlug(contextSlug, canView)) &&
          (article.context_slugs.includes(currentSlug) || article.context_slugs.includes("all"))
      );
  }, [staticWikiCategories, canView, currentSlug]);

  const mergedArticles = useMemo(() => {
    const dbMapped = articles.map((article) => ({
      ...article,
      sourceArticleId: article.id,
    }));

    const seen = new Set(dbMapped.map((article) => article.title.trim().toLowerCase()));
    const dedupedStatic = staticArticles.filter((article) => !seen.has(article.title.trim().toLowerCase()));

    return [...dbMapped, ...dedupedStatic];
  }, [articles, staticArticles]);

  const scopedArticles = useMemo(() => {
    const visible = mergedArticles.filter((article) => article.context_slugs.some((contextSlug) => canViewContextSlug(contextSlug, canView)));
    const exact = visible.filter((a) => a.context_slugs.includes(currentSlug));
    const shared = visible.filter((a) => a.context_slugs.includes("all"));
    const other = visible.filter((a) => !a.context_slugs.includes(currentSlug) && !a.context_slugs.includes("all"));
    return [...exact, ...shared, ...other];
  }, [mergedArticles, currentSlug, canView]);

  const initKeyRef = useRef<string>("");

  const articleSignature = useMemo(
    () => scopedArticles.map((article) => article.id).join("|"),
    [scopedArticles]
  );

  useEffect(() => {
    const initKey = `${currentSlug}::${articleSignature}`;
    if (initKeyRef.current === initKey) return;

    const exactIds = scopedArticles.filter((a) => a.context_slugs.includes(currentSlug)).map((a) => a.id);
    const nextIds = exactIds.length > 0 ? [exactIds[0]] : scopedArticles.length > 0 ? [scopedArticles[0].id] : [];

    setExpandedIds(nextIds);
    initKeyRef.current = initKey;
  }, [currentSlug, articleSignature, scopedArticles]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(300, newWidth), 720));
    };
    const onUp = () => setResizing(false);
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const handleEditFromFeedback = (articleId: string) => {
    const article = scopedArticles.find((a) => a.id === articleId);
    if (article) {
      setEditArticleId(articleId);
      setEditDialogOpen(true);
    }
  };

  if (!open) return null;

  const editingArticle = editArticleId ? scopedArticles.find((a) => a.id === editArticleId) : null;

  const toggleArticle = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <aside className="h-full flex border-l border-border bg-background shrink-0 min-w-0" style={{ width }}>
      <div
        className="w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors shrink-0"
        onMouseDown={() => setResizing(true)}
        style={{ background: resizing ? "hsl(215 65% 50% / 0.3)" : "transparent" }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold text-foreground truncate">Help</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-2">
            {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}

            {!isLoading && scopedArticles.length === 0 && (
              <p className="text-xs text-muted-foreground">No help articles available for this page.</p>
            )}

            {scopedArticles.map((article) => {
              const isExpanded = expandedIds.includes(article.id);
              const isExactContext = article.context_slugs.includes(currentSlug);

              return (
                <div key={article.id} className="border border-border overflow-hidden min-w-0">
                  <button
                    onClick={() => toggleArticle(article.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors min-w-0"
                  >
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                    />
                    <span className="text-[13px] font-medium text-foreground flex-1 truncate min-w-0">{article.title}</span>
                    <Badge variant={isExactContext ? "default" : "outline"} className="text-[10px] h-5 px-1.5 shrink-0">
                      {isExactContext ? "Page" : article.context_slugs.includes("all") ? "Global" : getContextLabel(article.context_slugs[0] ?? "all")}
                    </Badge>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 min-w-0">
                      <div className="text-[12px] leading-relaxed space-y-1 text-muted-foreground min-w-0 break-words [overflow-wrap:anywhere]">
                        <WikiArticleRenderer
                          legacyContent={article.content.replace(/\\n/g, "\n")}
                          className="space-y-1"
                          emptyMessage="No article content available."
                        />
                      </div>
                      <HelpFeedbackButtons
                        articleId={article.sourceArticleId}
                        articleTitle={article.title}
                        articleContent={article.content}
                        articleContextSlugs={article.context_slugs}
                        pageSlug={currentSlug}
                        onEdit={canEdit ? handleEditFromFeedback : undefined}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <Suspense fallback={null}>
        {canEdit && editDialogOpen && (
          <WikiArticleEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            article={
              editingArticle
                ? {
                    id: editingArticle.sourceArticleId,
                    title: editingArticle.title,
                    content: editingArticle.content,
                    page_slug: editingArticle.page_slug,
                    context_slugs: editingArticle.context_slugs,
                    sort_order: editingArticle.sort_order,
                  }
                : null
            }
            wikiHeadings={headings.map((heading) => ({ id: heading.slug, title: heading.title }))}
          />
        )}
      </Suspense>
    </aside>
  );
};

export default HelpPanel;
