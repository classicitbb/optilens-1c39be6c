import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WikiCategory } from "@/data/wikiContent";

interface WikiSidebarProps {
  categories: WikiCategory[];
  activeArticleId: string | null;
  onSelectArticle: (categoryId: string, articleId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const WikiSidebar = ({ categories, activeArticleId, onSelectArticle, searchTerm, onSearchChange }: WikiSidebarProps) => {
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const cat of categories) {
      if (cat.articles.some(a => a.id === activeArticleId)) {
        s.add(cat.id);
      }
    }
    if (s.size === 0 && categories.length > 0) s.add(categories[0].id);
    return s;
  });

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-64 shrink-0 border-r border-slate-700/60 flex flex-col bg-slate-950">
      <div className="p-3 border-b border-slate-700/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search articles…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="py-2 space-y-0.5">
          {categories.map((cat) => {
            const isOpen = openCategories.has(cat.id);
            const Icon = cat.icon;
            const hasActive = cat.articles.some(a => a.id === activeArticleId);

            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] rounded-sm transition-colors hover:bg-slate-800/60"
                  style={{
                    color: hasActive ? "rgb(96, 165, 250)" : "rgb(203, 213, 225)",
                    fontWeight: hasActive ? 600 : 400,
                  }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{cat.title}</span>
                  {isOpen
                    ? <ChevronDown className="h-3 w-3 shrink-0 text-slate-500" />
                    : <ChevronRight className="h-3 w-3 shrink-0 text-slate-500" />
                  }
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
                              ? "bg-blue-500/15 text-blue-400 font-medium"
                              : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-300"
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
        </nav>
      </ScrollArea>
    </div>
  );
};

export default WikiSidebar;
