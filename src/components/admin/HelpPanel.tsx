import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, BookOpen, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import HelpFeedbackButtons from "./HelpFeedbackButtons";

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

const HelpPanel = ({ open, onClose }: HelpPanelProps) => {
  const location = useLocation();
  const slug = routeToSlug(location.pathname);
  const { articles, isLoading } = useHelpArticles(slug);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [width, setWidth] = useState(380);
  const [resizing, setResizing] = useState(false);

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

  // Resize handler – prevent text selection while dragging
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

  if (!open) return null;

  /** Render markdown-ish content – split on real newlines AND literal \n sequences */
  const renderContent = (text: string) => {
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
        {/* Header – always visible */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold text-foreground truncate">Help</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content – scrollable */}
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
                      <HelpFeedbackButtons articleId={article.id} pageSlug={slug} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default HelpPanel;
