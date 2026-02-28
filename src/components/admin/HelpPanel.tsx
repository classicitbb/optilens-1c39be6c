import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { X, BookOpen, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import HelpFeedbackButtons from "./HelpFeedbackButtons";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { renderWikiContent } from "./wikiFormatting";
import { getContextLabel, pathnameToContextSlug } from "@/lib/adminContexts";
import { useWikiHeadings } from "@/hooks/useWikiHeadings";

const WikiArticleEditDialog = lazy(() => import("./WikiArticleEditDialog"));

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

const HelpPanel = ({ open, onClose }: HelpPanelProps) => {
  const location = useLocation();
  const slug = pathnameToContextSlug(location.pathname);
  const { articles, isLoading } = useHelpArticles(slug);
  const { headings } = useWikiHeadings();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [width, setWidth] = useState(380);
  const [resizing, setResizing] = useState(false);
  const { canEdit } = useAdminRole();
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const scopedArticles = useMemo(() => {
    const exact = articles.filter((a) => a.context_slugs.includes(slug));
    const shared = articles.filter((a) => a.context_slugs.includes("all"));
    const other = articles.filter((a) => !a.context_slugs.includes(slug) && !a.context_slugs.includes("all"));
    return [...exact, ...shared, ...other];
  }, [articles, slug]);

  useEffect(() => {
    const exactIds = scopedArticles.filter((a) => a.context_slugs.includes(slug)).map((a) => a.id);
    const nextIds = exactIds.length > 0 ? exactIds : scopedArticles.length > 0 ? [scopedArticles[0].id] : [];

    setExpandedIds((prev) => {
      if (prev.length === nextIds.length && prev.every((id, idx) => id === nextIds[idx])) {
        return prev;
      }
      return nextIds;
    });
  }, [slug, scopedArticles]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(280, newWidth), 600));
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

  const editingArticle = editArticleId
    ? scopedArticles.find((a) => a.id === editArticleId)
    : null;

  const isHtml = (text: string) => /<[a-z][\s\S]*>/i.test(text);

  const renderContent = (text: string) => {
    if (isHtml(text)) {
      return (
        <div
          className="prose prose-sm max-w-none text-muted-foreground [&_strong]:text-foreground [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-1 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-1 [&_p]:leading-relaxed [&_ul]:pl-4 [&_ul]:my-1 [&_ul]:list-disc [&_ol]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_li]:my-0.5 [&_li]:leading-relaxed [&_li]:marker:text-primary [&_a]:text-primary [&_a]:underline [&_br]:leading-3"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      );
    }

    return <div className="space-y-1">{renderWikiContent(text.replace(/\\n/g, "\n"))}</div>;
  };

  const toggleArticle = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div
      className="fixed top-0 right-0 h-full z-50 flex"
      style={{ width }}
    >
      <div
        className="w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors shrink-0"
        onMouseDown={() => setResizing(true)}
        style={{ background: resizing ? "hsl(215 65% 50% / 0.3)" : "transparent" }}
      />

      <div className="flex-1 flex flex-col border-l shadow-xl bg-background border-border min-w-0">
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
            {isLoading && (
              <p className="text-xs text-muted-foreground">Loading...</p>
            )}

            {!isLoading && scopedArticles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No help articles available for this page.
              </p>
            )}

            {scopedArticles.map((article) => {
              const isExpanded = expandedIds.includes(article.id);
              const isExactContext = article.context_slugs.includes(slug);

              return (
                <div
                  key={article.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleArticle(article.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground"
                      style={{
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    />
                    <span className="text-[13px] font-medium text-foreground flex-1">{article.title}</span>
                    <Badge variant={isExactContext ? "default" : "outline"} className="text-[10px] h-5 px-1.5">
                      {isExactContext ? "Page" : article.context_slugs.includes("all") ? "Global" : getContextLabel(article.context_slugs[0] ?? "all")}
                    </Badge>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="text-[12px] leading-relaxed space-y-1 text-muted-foreground">
                        {renderContent(article.content)}
                      </div>
                      <HelpFeedbackButtons
                        articleId={article.id}
                        pageSlug={slug}
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

      {canEdit && (
        <Suspense fallback={null}>
          <WikiArticleEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            article={
              editingArticle
                ? {
                    id: editingArticle.id,
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
        </Suspense>
      )}
    </div>
  );
};

export default HelpPanel;
