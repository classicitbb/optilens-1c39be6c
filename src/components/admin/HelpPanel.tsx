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
  if (!path) return "catalog";
  // Handle sub-routes like costings/shipments/123
  const parts = path.split("/");
  if (parts[0] === "costings") return "costings/shipments";
  if (parts[0] === "quotations") return "quotations";
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

  // Resize handler
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(280, newWidth), 600));
    };
    const onUp = () => setResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  if (!open) return null;

  /** Render markdown-ish content */
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;

      const withBold = trimmed.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} className="font-semibold" style={{ color: "hsl(215 30% 15%)" }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
        return (
          <div key={i} className="flex gap-2 pl-2">
            <span className="shrink-0" style={{ color: "hsl(215 65% 50%)" }}>•</span>
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
        className="w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
        onMouseDown={() => setResizing(true)}
        style={{ background: resizing ? "hsl(215 65% 50% / 0.3)" : "transparent" }}
      />

      {/* Panel */}
      <div
        className="flex-1 flex flex-col border-l shadow-xl"
        style={{
          background: "hsl(0 0% 100%)",
          borderColor: "hsl(215 15% 85%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 h-11 border-b shrink-0"
          style={{ borderColor: "hsl(215 15% 85%)" }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: "hsl(215 65% 50%)" }} />
            <span className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Help</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {isLoading && (
              <p className="text-xs" style={{ color: "hsl(215 20% 45%)" }}>Loading...</p>
            )}

            {!isLoading && articles.length === 0 && (
              <p className="text-xs" style={{ color: "hsl(215 20% 45%)" }}>
                No help articles available for this page.
              </p>
            )}

            {articles.map((article) => {
              const isExpanded = expandedId === article.id;
              return (
                <div
                  key={article.id}
                  className="border rounded-lg overflow-hidden"
                  style={{ borderColor: "hsl(215 15% 88%)" }}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 transition-transform"
                      style={{
                        color: "hsl(215 20% 45%)",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    />
                    <span className="text-[13px] font-medium" style={{ color: "hsl(215 30% 15%)" }}>
                      {article.title}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div
                        className="text-[12px] leading-relaxed space-y-1"
                        style={{ color: "hsl(215 15% 35%)" }}
                      >
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
