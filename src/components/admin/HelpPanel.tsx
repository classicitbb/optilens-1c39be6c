import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { X, BookOpen, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import HelpFeedbackButtons from "./HelpFeedbackButtons";
import { useAdminRole } from "@/contexts/AdminRoleContext";

const WikiArticleEditDialog = lazy(() => import("./WikiArticleEditDialog"));

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

/** Map admin route to page_slug */
const routeToSlug = (pathname: string): string => {
  const path = pathname.replace(/^\/admin\/?/, "").replace(/\/$/, "");
  if (!path || path === "catalog") return "catalog";
  const parts = path.split("/");
  if (parts[0] === "costings") return "costings/shipments";
  if (parts[0] === "quotations" || parts[0] === "quote-editor") return "quotations";
  if (parts[0] === "rx-lens-prices") return "rx-lens-prices";
  if (parts[0] === "stock-lens-prices") return "stock-lens-prices";
  if (parts[0] === "supplies-prices") return "supplies-prices";
  if (parts[0] === "reference") return "reference";
  if (parts[0] === "imports") return "imports";
  if (parts[0] === "parameters") return "parameters";
  if (parts[0] === "users") return "users";
  if (parts[0] === "wiki") return "wiki";
  if (parts[0] === "content") return "content";
  return parts[0];
};

const WIKI_HEADINGS = [
  { id: "getting-started", title: "Getting Started" },
  { id: "catalog-publisher", title: "Catalog Publisher" },
  { id: "product-catalog", title: "Product Catalog" },
  { id: "supplies-addons", title: "Supplies & Add-Ons" },
  { id: "pricing-engine", title: "Pricing Engine" },
  { id: "reference-imports", title: "Reference Data & Imports" },
  { id: "import-costings", title: "Import Costings" },
  { id: "quotations", title: "Quotations" },
  { id: "administration", title: "Administration" },
];

const HelpPanel = ({ open, onClose }: HelpPanelProps) => {
  const location = useLocation();
  const slug = routeToSlug(location.pathname);
  const { articles, isLoading } = useHelpArticles(slug);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [width, setWidth] = useState(380);
  const [resizing, setResizing] = useState(false);
  const { canEdit } = useAdminRole();
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Auto-expand first article
  useEffect(() => {
    if (articles.length > 0 && !expandedId) {
      setExpandedId(articles[0].id);
    }
  }, [articles]);

  // Reset expanded when page changes
  useEffect(() => {
    setExpandedId(null);
  }, [slug]);

  // Resize handler
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
    const article = articles.find((a) => a.id === articleId);
    if (article) {
      setEditArticleId(articleId);
      setEditDialogOpen(true);
    }
  };

  if (!open) return null;

  const editingArticle = editArticleId
    ? articles.find((a) => a.id === editArticleId)
    : null;

  /** Detect if content is HTML */
  const isHtml = (text: string) => /<[a-z][\s\S]*>/i.test(text);

  /** Render content – supports both HTML (from rich editor) and legacy markdown-ish */
  const renderContent = (text: string) => {
    if (isHtml(text)) {
      return (
        <div
          className="prose prose-sm max-w-none text-muted-foreground [&_strong]:text-foreground [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-1 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-1 [&_p]:leading-relaxed [&_ul]:pl-4 [&_ul]:my-1 [&_ul]:list-disc [&_ol]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_li]:my-0.5 [&_li]:leading-relaxed [&_li]:marker:text-primary [&_a]:text-primary [&_a]:underline [&_br]:leading-3"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      );
    }
    const normalized = text.replace(/\\n/g, "\n");
    return normalized.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;

      const withBold = trimmed.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
        return (
          <div key={i} className="flex gap-2 pl-2">
            <span className="shrink-0 text-primary">•</span>
            <span>{withBold.map((p) => typeof p === "string" ? p.replace(/^[•\-]\s*/, "") : p)}</span>
          </div>
        );
      }

      return <p key={i}>{withBold}</p>;
    });
  };

  return (
    <div
      className="fixed top-0 right-0 h-full z-50 flex"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className="w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors shrink-0"
        onMouseDown={() => setResizing(true)}
        style={{ background: resizing ? "hsl(215 65% 50% / 0.3)" : "transparent" }}
      />

      {/* Panel */}
      <div className="flex-1 flex flex-col border-l shadow-xl bg-background border-border min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold text-foreground truncate">Help</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-2">
            {isLoading && (
              <p className="text-xs text-muted-foreground">Loading...</p>
            )}

            {!isLoading && articles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No help articles available for this page.
              </p>
            )}

            {articles.map((article) => {
              const isExpanded = expandedId === article.id;
              return (
                <div
                  key={article.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground"
                      style={{
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    />
                    <span className="text-[13px] font-medium text-foreground">
                      {article.title}
                    </span>
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

      {/* Edit dialog for admin */}
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
                    sort_order: editingArticle.sort_order,
                  }
                : null
            }
            wikiHeadings={WIKI_HEADINGS}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HelpPanel;
