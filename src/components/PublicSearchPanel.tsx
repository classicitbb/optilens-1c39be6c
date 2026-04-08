import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { Link, useLocation } from "react-router";
import { Bot, BookOpen, FileText, Link2, Package, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { usePublicKnowledge } from "@/hooks/useContentArticles";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { buildAssistantCorpus, collectRuntimeHeadings, runAssistantQuery } from "@/features/assistant/companionAssistantEngine";

type SearchResult = {
  id: string;
  title: string;
  description: string;
  path: string;
  group: "Pages" | "Forms" | "Anchors" | "Products" | "Knowledge Base" | "Retailers";
};

const GROUP_ICON: Record<SearchResult["group"], React.ElementType> = {
  Pages: FileText,
  Forms: Bot,
  Anchors: Link2,
  Products: Package,
  "Knowledge Base": BookOpen,
  Retailers: Bot,
};

export const PublicSearchPanel = ({ compact = false }: { compact?: boolean }) => {
  const location = useLocation();
  const { openAssistant } = useCompanionAssistant();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { data: products = [] } = useStoreProducts();
  const { data: knowledge = [] } = usePublicKnowledge();

  useEffect(() => {
    const timer = window.setTimeout(() => setShowPrompt(true), compact ? 22000 : 14000);
    return () => window.clearTimeout(timer);
  }, [compact]);

  const runtimeHeadings = useMemo(
    () => collectRuntimeHeadings(location.pathname),
    [location.pathname, query],
  );

  const corpus = useMemo(
    () => buildAssistantCorpus({ products, knowledge, runtimeHeadings }),
    [knowledge, products, runtimeHeadings],
  );

  const searchResult = useMemo(() => {
    if (!query.trim()) return null;
    return runAssistantQuery({
      query,
      route: location.pathname,
      profile: location.pathname.startsWith("/find-a-retailer") ? "retailer_help" : "general_search",
      corpus,
    });
  }, [corpus, location.pathname, query]);

  const filtered = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const mapped: SearchResult[] = (searchResult?.topLinks ?? []).slice(0, compact ? 6 : 10).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      path: item.path,
      group: (
        item.kind === "product"
          ? "Products"
          : item.kind === "knowledge"
            ? "Knowledge Base"
            : item.kind === "retailer"
              ? "Retailers"
              : "Pages"
      ) as SearchResult["group"],
    }));
    const nonHome = mapped.filter((entry) => entry.path !== "/" && entry.title.trim().toLowerCase() !== "home");
    if (nonHome.length > 0) return nonHome;
    const homeQuery = /\b(home|homepage|main|landing)\b/i.test(query);
    return homeQuery ? mapped : [];
  }, [compact, query, searchResult?.topLinks]);

  useEffect(() => {
    const updatePosition = () => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      setDropdownRect({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      });
      setViewportHeight(window.innerHeight);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, []);

  return (
    <div ref={panelRef} className={`relative z-[120] isolate ${compact ? "w-[280px]" : "w-full"}`}>
      <div
        className={`relative rounded-[20px] border bg-background/95 p-2 transition ${
          showPrompt && !focused ? "animate-pulse border-primary/60 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]" : "border-border/80"
        }`}
      >
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Sparkles className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 150);
          }}
          placeholder={compact ? "AI Search: pages, products, FAQs..." : "Ask anything - pages, products, FAQs, forms, and anchors"}
          className={`border-0 bg-transparent pl-10 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 ${compact ? "h-9 text-sm" : "h-12 text-base"}`}
        />
      </div>

      {showPrompt && !focused && !query && !compact && (
        <div className="mt-3 flex items-center justify-between rounded-[18px] border border-primary/25 bg-primary/10 p-3 text-sm text-foreground shadow-[0_16px_40px_rgba(2,6,23,0.16)]">
          <span>Not finding what you need? Can we help?</span>
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => {
              inputRef.current?.focus();
              setFocused(true);
            }}
          >
            Yes, open search
          </Button>
        </div>
      )}

      {focused && query && dropdownRect && typeof document !== "undefined" && createPortal(
        <div
          className="z-[9999] overflow-y-auto rounded-[22px] border border-border/80 bg-popover/98 p-2 shadow-[0_30px_90px_rgba(2,6,23,0.32)]"
          style={{
            position: "fixed",
            left: dropdownRect.left,
            top: dropdownRect.top,
            width: dropdownRect.width,
            maxHeight: Math.max(220, viewportHeight - dropdownRect.top - 16),
          }}
        >
          {filtered.length === 0 ? (
            <div className="space-y-3 p-3 text-sm text-muted-foreground">
              <p>No direct results for "{query}".</p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openAssistant({ query, autoSubmit: true })}
              >
                Ask the companion assistant
              </Button>
            </div>
          ) : (
            <>
              {!compact && searchResult ? (
                <div className="mb-2 w-full rounded-[18px] border border-primary/20 bg-primary/10 p-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Quick answer</p>
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed [&_p]:mb-1.5 [&_ul]:mt-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-foreground">
                    <ReactMarkdown>{searchResult.answer}</ReactMarkdown>
                  </div>
                  {searchResult.topLinks.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {searchResult.topLinks.slice(0, 3).map((link, i) => (
                        link.external ? (
                          <a
                            key={link.path}
                            href={link.website || link.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseDown={(e) => e.preventDefault()}
                            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                          >
                            <span className="text-muted-foreground/60">[{i + 1}]</span>
                            {link.title}
                          </a>
                        ) : (
                          <Link
                            key={link.path}
                            to={link.path}
                            onMouseDown={(e) => e.preventDefault()}
                            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                          >
                            <span className="text-muted-foreground/60">[{i + 1}]</span>
                            {link.title}
                          </Link>
                        )
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:text-primary/80 transition block pt-0.5"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openAssistant({ query, autoSubmit: true })}
                  >
                    Ask follow-up questions →
                  </button>
                </div>
              ) : null}
              {filtered.map((result) => {
                const Icon = GROUP_ICON[result.group];
                return (
                  <Link
                    key={result.id}
                    to={result.path}
                    className="flex items-start gap-3 rounded-[16px] border border-transparent p-3 transition hover:border-primary/25 hover:bg-muted/70"
                  >
                    <Icon className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{result.title}</p>
                      <p className="text-xs text-muted-foreground">{result.description}</p>
                      <p className="text-[11px] text-muted-foreground">{result.group}</p>
                    </div>
                  </Link>
                );
              })}
              <div className="border-t border-border/70 px-3 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => openAssistant({ query, autoSubmit: true })}
                >
                  Ask the companion assistant
                </Button>
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default PublicSearchPanel;
