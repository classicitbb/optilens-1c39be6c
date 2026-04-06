import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Bot, BookOpen, FileText, Link2, Package, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { usePublicKnowledge } from "@/hooks/useContentArticles";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { buildAssistantCorpus, runAssistantQuery } from "@/features/assistant/companionAssistantEngine";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: products = [] } = useStoreProducts();
  const { data: knowledge = [] } = usePublicKnowledge();

  useEffect(() => {
    const timer = window.setTimeout(() => setShowPrompt(true), compact ? 22000 : 14000);
    return () => window.clearTimeout(timer);
  }, [compact]);

  const corpus = useMemo(() => buildAssistantCorpus({ products, knowledge }), [products, knowledge]);

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
    return (searchResult?.topLinks ?? []).slice(0, compact ? 6 : 10).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      path: item.path,
      group:
        item.kind === "product"
          ? "Products"
          : item.kind === "knowledge"
            ? "Knowledge Base"
            : item.kind === "retailer"
              ? "Retailers"
              : "Pages",
    }));
  }, [compact, query, searchResult?.topLinks]);

  return (
    <div className={`relative ${compact ? "w-[280px]" : "w-full"}`}>
      <div
        className={`relative rounded-[20px] border bg-slate-950/90 p-2 transition ${
          showPrompt && !focused ? "animate-pulse border-sky-400/65 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]" : "border-slate-700/80"
        }`}
      >
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Sparkles className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-300" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 150);
          }}
          placeholder={compact ? "AI Search: pages, products, FAQs..." : "Ask anything - pages, products, FAQs, forms, and anchors"}
          className={`border-0 bg-transparent pl-10 pr-10 text-slate-50 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 ${compact ? "h-9 text-sm" : "h-12 text-base"}`}
        />
      </div>

      {showPrompt && !focused && !query && !compact && (
        <div className="mt-3 flex items-center justify-between rounded-[18px] border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-slate-100 shadow-[0_16px_40px_rgba(2,6,23,0.22)]">
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

      {focused && query && (
        <div className="absolute left-0 top-full z-40 mt-2 max-h-[30rem] w-full overflow-y-auto rounded-[22px] border border-slate-700/80 bg-slate-950/97 p-2 shadow-[0_30px_90px_rgba(2,6,23,0.58)]">
          {filtered.length === 0 ? (
            <div className="space-y-3 p-3 text-sm text-slate-400">
              <p>No direct results for "{query}".</p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-slate-600/80 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openAssistant({ query, autoSubmit: true })}
              >
                Ask the companion assistant
              </Button>
            </div>
          ) : (
            <>
              {!compact && searchResult ? (
                <button
                  type="button"
                  className="mb-2 w-full rounded-[18px] border border-sky-400/18 bg-sky-500/10 p-3 text-left transition hover:border-sky-400/30 hover:bg-sky-500/14"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => openAssistant({ query, autoSubmit: true })}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">Quick answer</p>
                  <p className="mt-2 text-sm leading-6 text-slate-50">{searchResult.answer}</p>
                </button>
              ) : null}
              {filtered.map((result) => {
                const Icon = GROUP_ICON[result.group];
                return (
                  <Link
                    key={result.id}
                    to={result.path}
                    className="flex items-start gap-3 rounded-[16px] border border-transparent p-3 transition hover:border-sky-400/20 hover:bg-slate-900"
                  >
                    <Icon className="mt-0.5 h-4 w-4 text-sky-300" />
                    <div>
                      <p className="text-sm font-medium text-slate-50">{result.title}</p>
                      <p className="text-xs text-slate-400">{result.description}</p>
                      <p className="text-[11px] text-slate-500">{result.group}</p>
                    </div>
                  </Link>
                );
              })}
              <div className="border-t border-slate-800/80 px-3 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-slate-600/80 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => openAssistant({ query, autoSubmit: true })}
                >
                  Ask the companion assistant
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicSearchPanel;
