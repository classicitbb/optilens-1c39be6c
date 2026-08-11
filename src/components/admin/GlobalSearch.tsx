import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { fieldsMatch } from "@/lib/wildcardMatch";
import { Search, BookOpen, ArrowRight, PlusCircle, Ticket, User, Activity, LayoutDashboard } from "lucide-react";
import { wikiCategories } from "@/data/wikiContent";
import { cn } from "@/lib/utils";
import { useRolePermissions, PATH_FEATURE_MAP } from "@/hooks/useRolePermissions";
import { canViewContextSlug, canViewWikiCategory } from "@/lib/wikiPermissions";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toAdminWikiArticlePath } from "@/lib/wikiArticleRouting";
import { CREATE_ACTIVITY_SEARCH_KEYWORDS, CREATE_TICKET_SEARCH_KEYWORDS, NEW_RX_ORDER_SEARCH_KEYWORDS } from "./globalSearchActions";
import { useRecentModules } from "@/features/admin/core/hooks/useRecentModules";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";
import { ACTIVE_NAVIGATION_REGISTRY } from "@/config/navigationRegistry";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
}

const humanizeRouteId = (id: string) => id
  .replace(/^admin\./, "")
  .replace(/[._-]+/g, " ")
  .replace(/\b\w/g, (character) => character.toUpperCase());

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { canView, canEditFeature, hasAppAccess } = useRolePermissions();
  const recentPaths = useRecentModules();

  const moduleResults = useMemo<SearchResult[]>(() => {
    return Object.values(ADMIN_APPS)
      .flatMap((app) =>
        app.sidebarItems.map((item) => {
          const feature = PATH_FEATURE_MAP[item.route];
          if ((!feature || !canView(feature)) && !hasAppAccess(app.featurePrefix)) return null;
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
  }, [canView, hasAppAccess]);

  // Keep search coverage tied to the canonical route registry. Sidebar entries
  // remain the preferred presentation, while this fallback makes a newly
  // registered concrete admin route discoverable even before a sidebar item is
  // added. Parameterized routes are intentionally omitted because they cannot
  // be opened without an identifier.
  const registeredRouteResults = useMemo<SearchResult[]>(() => {
    const results = APP_ROUTE_REGISTRY
      .filter((route) => route.domain === "admin-console" && route.status === "active")
      .filter((route) => !route.path.includes(":"))
      .map((route) => {
        const navigation = ACTIVE_NAVIGATION_REGISTRY.find((item) => item.routeId === route.id);
        const app = Object.values(ADMIN_APPS).find((candidate) =>
          candidate.sidebarItems.some((item) => item.route === route.path) || route.path.startsWith(`${candidate.baseRoute}/`),
        );
        const sidebarItem = app?.sidebarItems.find((item) => item.route === route.path);
        const feature = PATH_FEATURE_MAP[route.path];

        if (feature && !canView(feature) && !app?.featurePrefix) return null;
        if (app && !hasAppAccess(app.featurePrefix)) return null;

        return {
          id: `route-${route.id}`,
          label: navigation?.label ?? sidebarItem?.label ?? humanizeRouteId(route.id),
          sublabel: app?.title ?? "Admin route",
          path: route.path,
          icon: sidebarItem?.icon ?? app?.icon ?? LayoutDashboard,
          group: "Routes",
          keywords: [route.id, route.path],
        } satisfies SearchResult;
      })
      .filter((item): item is SearchResult => !!item);

    const existingPaths = new Set(moduleResults.map((result) => result.path));
    return results.filter((result) => !existingPaths.has(result.path));
  }, [canView, hasAppAccess, moduleResults]);

  const recentModuleResults = useMemo<SearchResult[]>(() => {
    if (query.trim()) return [];
    
    return recentPaths.map(path => {
      let foundApp, foundItem;
      for (const app of Object.values(ADMIN_APPS)) {
        const item = app.sidebarItems.find(i => i.route === path);
        if (item) {
          foundApp = app;
          foundItem = item;
          break;
        }
      }
      if (!foundItem) return null;
      
      return {
        id: `recent-${foundItem.route}`,
        label: foundItem.label,
        sublabel: foundApp?.title,
        path: foundItem.route,
        icon: foundItem.icon,
        group: "Recent Modules",
      } as SearchResult;
    }).filter(Boolean) as SearchResult[];
  }, [recentPaths, query]);

  const actionResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    if (hasAppAccess("crm")) results.push({
      id: "action-create-activity",
      label: "Create Activity",
      sublabel: "CRM",
      path: "/admin/crm/activities?create=1",
      icon: PlusCircle,
      group: "Actions",
      keywords: [...CREATE_ACTIVITY_SEARCH_KEYWORDS],
    });
    if (canEditFeature("helpdesk")) results.push({
      id: "action-create-ticket",
      label: "Create Ticket",
      sublabel: "Helpdesk",
      path: "/admin/helpdesk/tickets?createTicket=1",
      icon: Ticket,
      group: "Actions",
      keywords: [...CREATE_TICKET_SEARCH_KEYWORDS],
    });
    if (hasAppAccess("website")) results.push({
      id: "action-new-rx-order",
      label: "New Rx Order",
      sublabel: "Quotations",
      path: "/admin/website/quotations/new-rx",
      icon: PlusCircle,
      group: "Actions",
      keywords: [...NEW_RX_ORDER_SEARCH_KEYWORDS],
    });
    return results;
  }, [canEditFeature, hasAppAccess]);

  const { data: dbSearchResults = [] } = useQuery({
    queryKey: ["global_search_db", query],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];
      const q = `%${query}%`;
      const results: SearchResult[] = [];

      if (hasAppAccess("crm")) {
        const { data: contacts } = await (supabase.from("contacts") as any)
          .select("id, first_name, last_name, email, company_name")
          .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q},company_name.ilike.${q}`)
          .limit(5);
        if (contacts) {
          results.push(...contacts.map((c: any) => ({
            id: `contact-${c.id}`,
            label: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unknown Contact",
            sublabel: c.email || "Contact / Lead",
            path: `/admin/contacts/${c.id}`,
            icon: User,
            group: "Contacts & Leads",
          })));
        }

        const { data: activities } = await (supabase.from("activities") as any)
          .select("id, title, activity_type")
          .ilike("title", q)
          .limit(5);
        if (activities) {
          results.push(...activities.map((a: any) => ({
            id: `activity-${a.id}`,
            label: a.title || "Untitled Activity",
            sublabel: a.activity_type || "Activity",
            path: `/admin/crm/activities?id=${a.id}`,
            icon: Activity,
            group: "Activities",
          })));
        }
      }

      const { data: profiles } = await (supabase.from("profiles") as any)
        .select("id, full_name, display_name")
        .or(`full_name.ilike.${q},display_name.ilike.${q}`)
        .limit(5);
      if (profiles) {
        results.push(...profiles.map((p: any) => ({
          id: `profile-${p.id}`,
          label: p.full_name || p.display_name || "Unknown User",
          sublabel: "Web Portal User",
          path: `/admin/settings/users?id=${p.id}`,
          icon: User,
          group: "Web Portal",
        })));
      }

      return results;
    },
    enabled: query.trim().length >= 2,
  });

  const { data: wikiResults = [] } = useQuery({
    queryKey: ["global_search_wiki_articles"],
    queryFn: async () => {
      if (!canView("wiki")) return [] as SearchResult[];

      const staticResults: SearchResult[] = wikiCategories
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

      const { data, error } = await (supabase.from("help_articles") as any)
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

  const allResults = useMemo(
    () => [...moduleResults, ...registeredRouteResults, ...actionResults, ...wikiResults, ...dbSearchResults],
    [actionResults, dbSearchResults, moduleResults, registeredRouteResults, wikiResults],
  );

  const results = useMemo(() => {
    if (!query.trim()) return recentModuleResults;
    const q = query.toLowerCase();
    return allResults.filter((r) => fieldsMatch(q, r.label, r.sublabel, r.group, ...(r.keywords ?? [])));
  }, [allResults, query, recentModuleResults]);

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

  const selectResult = (result: SearchResult) => {
    if (result.id === "action-create-activity") {
      const params = new URLSearchParams(location.search);
      params.set("createActivity", "1");
      navigate({ pathname: location.pathname, search: `?${params.toString()}` });
    } else {
      navigate(result.path);
    }
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && flatResults[highlighted]) {
      selectResult(flatResults[highlighted]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    selectResult(result);
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
