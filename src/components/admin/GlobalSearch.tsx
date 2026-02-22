import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fieldsMatch } from "@/lib/wildcardMatch";
import { Search, BookOpen, Layers, DollarSign, Ship, Users, Settings, FileSpreadsheet, FlaskConical, Glasses, ShoppingCart, Upload, Database, ArrowRight } from "lucide-react";
import { wikiCategories } from "@/data/wikiContent";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  icon: React.ElementType;
  group: string;
}

const MODULE_RESULTS: SearchResult[] = [
  { id: "catalog", label: "Product Catalog", sublabel: "Browse lenses, supplies, and add-ons", path: "/admin/catalog", icon: Layers, group: "Modules" },
  { id: "reference", label: "Reference Data", sublabel: "Suppliers, brands, materials, lens types", path: "/admin/reference", icon: Database, group: "Modules" },
  { id: "imports", label: "Imports", sublabel: "Import lenses, supplies, add-ons from CSV", path: "/admin/imports", icon: Upload, group: "Modules" },
  { id: "rx-lens-prices", label: "RX Lens Prices", sublabel: "Prescription lens pricing", path: "/admin/rx-lens-prices", icon: FlaskConical, group: "Modules" },
  { id: "stock-lens-prices", label: "Stock Lens Prices", sublabel: "Stock lens pricing", path: "/admin/stock-lens-prices", icon: Glasses, group: "Modules" },
  { id: "buy-sell-prices", label: "Buy / Sell Prices", sublabel: "Buy and sell price management", path: "/admin/buy-sell-prices", icon: ShoppingCart, group: "Modules" },
  { id: "quotations", label: "Quotations", sublabel: "Build and export customer quotes", path: "/admin/quotations", icon: FileSpreadsheet, group: "Modules" },
  { id: "costings", label: "Import Costings", sublabel: "Shipments and landed cost management", path: "/admin/costings/shipments", icon: Ship, group: "Modules" },
  { id: "users", label: "Users", sublabel: "Manage users and roles", path: "/admin/users", icon: Users, group: "Modules" },
  { id: "settings", label: "Settings", sublabel: "Company settings, legacy rates, pricing parameters", path: "/admin/parameters", icon: Settings, group: "Modules" },
  { id: "wiki", label: "Help / Wiki", sublabel: "Documentation and guides", path: "/admin/wiki", icon: BookOpen, group: "Modules" },
];

// Flatten wiki articles into searchable results
const WIKI_RESULTS: SearchResult[] = wikiCategories.flatMap((cat) =>
  cat.articles.map((article) => ({
    id: `wiki-${cat.id}-${article.id}`,
    label: article.title,
    sublabel: cat.title,
    path: `/admin/wiki#${article.id}`,
    icon: BookOpen,
    group: "Help / Wiki",
  }))
);

const ALL_RESULTS = [...MODULE_RESULTS, ...WIKI_RESULTS];

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ALL_RESULTS.filter((r) => fieldsMatch(q, r.label, r.sublabel, r.group)).slice(0, 10);
  }, [query]);

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
