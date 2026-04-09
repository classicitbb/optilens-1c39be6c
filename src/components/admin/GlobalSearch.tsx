import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { fieldsMatch } from "@/lib/wildcardMatch";
import { Search, BookOpen, ArrowRight } from "lucide-react";
import { wikiCategories } from "@/data/wikiContent";
import { cn } from "@/lib/utils";
import { useRolePermissions, PATH_FEATURE_MAP } from "@/hooks/useRolePermissions";
import { canViewContextSlug, canViewWikiCategory } from "@/lib/wikiPermissions";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toAdminWikiArticlePath } from "@/lib/wikiArticleRouting";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  icon: React.ElementType;
  group: string;
}

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { canView } = useRolePermissions();

  const moduleResults = useMemo<SearchResult[]>(() => {
    return Object.values(ADMIN_APPS)
      .flatMap((app) =>
        app.sidebarItems.map((item) => {
          const feature = PATH_FEATURE_MAP[item.route];
          if (!feature || !canView(feature)) return null;
          return {
            id: `module-${item.route}`,
            label: item.label,
            sublabel: app.title,
            path: item.route,
            icon: item.icon,
            group: "Modules",
          } as SearchResult;
        })
      )
      .filter((item): item is SearchResult => !!item);
  }, [canView]);

  const { data: wikiResults = [] } = useQuery({
    queryKey: ["global_search_wiki_articles"],
    queryFn: async () => {
      if (!canView("wiki")) return [] as SearchResult[];

      const staticResults = wikiCategories
        .filter((category) => canViewWikiCategory(category.id, canView))
        .flatMap((cat) =>
          cat.articles.map((article) => ({
            id: `wiki-static-${cat.id}-${article.id}`,
            label: article.title,
            sublabel: cat.title,
            path: toAdminWikiArticlePath({ id: `static:${article.id}`, title: article.title }),
            icon: BookOpen,
            group: "Help / Wiki",
          }))
        );

      const { data, error } = await (supabase
        .from("help_articles") as any)
        .select("*, help_article_contexts(context_slug)")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;

      const dbResults: SearchResult[] = ((data ?? []) as any[])
        .map((article) => {
          const contexts = article.help_article_contexts?.map((c: any) => c.context_slug).filter(Boolean) ?? [];
          const effectiveContexts = contexts.length > 0 ? contexts : [article.page_slug];
          const allowedContexts = effectiveContexts.filter((contextSlug: string) => canViewContextSlug(contextSlug, canView));
          if (allowedContexts.length === 0) return null;

          return {
            id: `wiki-db-${article.id}`,
            label: article.title,
            sublabel: article.category || "Custom",
            path: toAdminWikiArticlePath({ id: article.id, title: article.title, slug: article.slug }),
            icon: BookOpen,
            group: "Help / Wiki",
          };
        })
        .filter((result): result is NonNullable<typeof result> => !!result) as SearchResult[];

      return [...staticResults, ...dbResults];
    },
    enabled: canView("wiki"),
  });

  const allResults = useMemo(() => [...moduleResults, ...wikiResults], [moduleResults, wikiResults]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allResults.filter((r) => fieldsMatch(q, r.label, r.sublabel, r.group)).slice(0, 10);
  }, [allResults, query]);

  // Group results
  const grouped = useMemo(() => {
    const map: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!map[r.group]) map[r.group] = [];
      map[r.group].push(r);
    }
    return map;
  }, [results]);

  const flatResults = results; // for keyboard nav

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (open && results.length === 0 && query) return;
    if (!open) setQuery("");
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Global keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && flatResults[highlighted]) {
      navigate(flatResults[highlighted].path);
      setOpen(false);
      setQuery("");
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setOpen(false);
    setQuery("");
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div className="relative flex-1 max-w-xl">
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
          style={{ color: "hsl(215 15% 55%)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search modules, wiki, settings… (Ctrl+K)"
          className="h-7 w-full pl-8 pr-3 text-xs rounded border outline-none transition-all"
          style={{
            borderColor: open ? "hsl(215 65% 60%)" : "hsl(215 15% 82%)",
            background: "hsl(210 20% 97%)",
            color: "hsl(215 30% 15%)",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs leading-none"
            style={{ color: "hsl(215 15% 55%)" }}
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 w-full max-h-80 overflow-y-auto rounded-lg border shadow-xl z-[200] py-1"
          style={{ background: "hsl(0 0% 100%)", borderColor: "hsl(215 15% 82%)" }}
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-xs" style={{ color: "hsl(215 15% 55%)" }}>
              No results for "<span className="font-medium">{query}</span>"
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div
                  className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "hsl(215 15% 55%)" }}
                >
                  {group}
                </div>
                {items.map((result) => {
                  const idx = flatResults.indexOf(result);
                  const isHighlighted = idx === highlighted;
                  return (
                    <button
                      key={result.id}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors group"
                      )}
                      style={{
                        background: isHighlighted ? "hsl(215 65% 50% / 0.08)" : "transparent",
                      }}
                      onMouseEnter={() => setHighlighted(idx)}
                      onClick={() => handleSelect(result)}
                    >
                      <result.icon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isHighlighted ? "hsl(215 65% 50%)" : "hsl(215 15% 55%)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xs font-medium truncate"
                          style={{ color: isHighlighted ? "hsl(215 65% 40%)" : "hsl(215 30% 15%)" }}
                        >
                          {result.label}
                        </div>
                        {result.sublabel && (
                          <div
                            className="text-[10px] truncate"
                            style={{ color: "hsl(215 15% 55%)" }}
                          >
                            {result.sublabel}
                          </div>
                        )}
                      </div>
                      <ArrowRight
                        className={cn(
                          "h-3 w-3 shrink-0 transition-opacity",
                          isHighlighted ? "opacity-100" : "opacity-0"
                        )}
                        style={{ color: "hsl(215 65% 50%)" }}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
