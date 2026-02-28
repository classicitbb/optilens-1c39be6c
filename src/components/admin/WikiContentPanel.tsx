import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WikiCategory } from "@/data/wikiContent";
import HelpFeedbackButtons from "./HelpFeedbackButtons";

interface WikiContentPanelProps {
  categories: WikiCategory[];
  activeArticleId: string | null;
  canEdit?: boolean;
  onEditArticle?: (article: { id: string; title: string; content: string }, categoryId: string) => void;
  isCategoryVisible?: (categoryId: string) => boolean;
}

const PROSE_CLASSES =
  "prose prose-sm max-w-none text-muted-foreground " +
  "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 " +
  "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-1.5 " +
  "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 " +
  "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-1 " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 " +
  "[&_li]:text-sm [&_li]:mb-0.5 " +
  "[&_a]:text-primary [&_a]:underline [&_a]:cursor-pointer " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic " +
  "[&_pre]:bg-muted/30 [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-xs [&_pre]:overflow-x-auto " +
  "[&_hr]:border-border [&_hr]:my-4";

const WikiContentPanel = ({ categories, activeArticleId, canEdit, onEditArticle, isCategoryVisible }: WikiContentPanelProps) => {
  const displayCategories = categories.filter((category) => category.articles.length > 0 && (isCategoryVisible ? isCategoryVisible(category.id) : true));
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

        {/* Content — rendered as HTML matching Tiptap editor output */}
        <div
          className={PROSE_CLASSES}
          dangerouslySetInnerHTML={{ __html: activeArticle.content || "<p>No content yet.</p>" }}
        />

        {/* Feedback */}
        <div className="pt-6">
          <HelpFeedbackButtons articleId={activeArticle.id} pageSlug="wiki" />
        </div>
      </div>
    </ScrollArea>
  );
};

export default WikiContentPanel;
