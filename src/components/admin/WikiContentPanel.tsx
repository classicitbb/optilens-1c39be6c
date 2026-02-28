import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WikiCategory } from "@/data/wikiContent";
import HelpFeedbackButtons from "./HelpFeedbackButtons";
import { extractWikiSections, renderWikiContent } from "./wikiFormatting";

interface WikiContentPanelProps {
  categories: WikiCategory[];
  activeArticleId: string | null;
  canEdit?: boolean;
  onEditArticle?: (article: { id: string; title: string; content: string }, categoryId: string) => void;
}

const WikiContentPanel = ({ categories, activeArticleId, canEdit, onEditArticle }: WikiContentPanelProps) => {
  const displayCategories = categories.filter((category) => category.articles.length > 0);
  let activeCategory: WikiCategory | undefined;
  let activeArticle: { id: string; title: string; content: string } | undefined;

  for (const cat of displayCategories) {
    const found = cat.articles.find(a => a.id === activeArticleId);
    if (found) {
      activeCategory = cat;
      activeArticle = found;
      break;
    }
  }

  const sections = useMemo(
    () => (activeArticle ? extractWikiSections(activeArticle.content) : []),
    [activeArticle]
  );

  if (!activeArticle || !activeCategory) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Select an article from the sidebar.
        </p>
      </div>
    );
  }

  const Icon = activeCategory.icon;

  return (
    <ScrollArea className="flex-1 bg-background">
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        {/* Breadcrumb + Edit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Icon className="h-3 w-3" />
            <span>{activeCategory.title}</span>
            <span>/</span>
            <span className="text-foreground">{activeArticle.title}</span>
          </div>
          {canEdit && onEditArticle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Edit article"
              onClick={() => onEditArticle(activeArticle!, activeCategory!.id)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          {activeArticle.title}
        </h1>

        {/* Table of Contents */}
        {sections.length > 1 && (
          <nav className="border border-border rounded-lg bg-muted/30 p-4 space-y-1">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">On this page</p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-[13px] text-primary hover:text-primary/80 transition-colors py-0.5"
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        {/* Content */}
        <div className="text-[13px] leading-relaxed space-y-1.5 text-muted-foreground">
          {renderWikiContent(activeArticle.content)}
        </div>

        {/* Feedback */}
        <div className="pt-6">
          <HelpFeedbackButtons articleId={activeArticle.id} pageSlug="wiki" />
        </div>
      </div>
    </ScrollArea>
  );
};

export default WikiContentPanel;
