import { useState } from "react";
import { ChevronDown, ChevronRight, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { WikiCategory } from "@/data/wikiContent";

interface WikiSidebarProps {
  categories: WikiCategory[];
  activeArticleId: string | null;
  onSelectArticle: (categoryId: string, articleId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  canEdit?: boolean;
  onAddHeading?: (title: string) => void;
}

const WikiSidebar = ({
  categories,
  activeArticleId,
  onSelectArticle,
  searchTerm,
  onSearchChange,
  canEdit,
  onAddHeading,
}: WikiSidebarProps) => {
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const cat of categories) {
      if (cat.articles.some((a) => a.id === activeArticleId)) {
        s.add(cat.id);
      }
    }
    if (s.size === 0 && categories.length > 0) s.add(categories[0].id);
    return s;
  });
  const [addingHeading, setAddingHeading] = useState(false);
  const [newHeadingTitle, setNewHeadingTitle] = useState("");

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddHeading = () => {
    if (newHeadingTitle.trim() && onAddHeading) {
      onAddHeading(newHeadingTitle.trim());
      setNewHeadingTitle("");
      setAddingHeading(false);
    }
  };

  return (
    <div className="w-64 shrink-0 border-r border-border flex flex-col bg-muted/20">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="py-2 space-y-0.5">
          {categories.map((cat) => {
            const isOpen = openCategories.has(cat.id);
            const Icon = cat.icon;
            const hasActive = cat.articles.some((a) => a.id === activeArticleId);

            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-[13px] rounded-sm transition-colors hover:bg-muted/60 ${
                    hasActive
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{cat.title}</span>
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="ml-4 space-y-0.5 mt-0.5">
                    {cat.articles.map((article) => {
                      const isActive = article.id === activeArticleId;
                      return (
                        <button
                          key={article.id}
                          onClick={() => onSelectArticle(cat.id, article.id)}
                          className={`flex items-center w-full px-3 py-1 text-[12px] rounded-sm transition-colors text-left ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          {article.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Heading button */}
          {canEdit && (
            <div className="px-3 pt-2">
              {addingHeading ? (
                <div className="flex gap-1">
                  <Input
                    value={newHeadingTitle}
                    onChange={(e) => setNewHeadingTitle(e.target.value)}
                    placeholder="Heading name…"
                    className="h-7 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddHeading();
                      if (e.key === "Escape") setAddingHeading(false);
                    }}
                  />
                  <Button size="sm" className="h-7 text-xs px-2" onClick={handleAddHeading}>
                    Add
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground w-full justify-start"
                  onClick={() => setAddingHeading(true)}
                >
                  <Plus className="h-3 w-3" /> Add Heading
                </Button>
              )}
            </div>
          )}
        </nav>
      </ScrollArea>
    </div>
  );
};

export default WikiSidebar;
