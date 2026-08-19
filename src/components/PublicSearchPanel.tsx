import { useEffect, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

export const PublicSearchPanel = ({ compact = false }: { compact?: boolean }) => {
  const { openAssistant } = useCompanionAssistant();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowPrompt(true), compact ? 22000 : 14000);
    return () => window.clearTimeout(timer);
  }, [compact]);

  const handOffToAssistant = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    openAssistant({ query: trimmed, autoSubmit: true });
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div className={compact ? "w-[280px]" : "w-full"}>
      <div
        className={`relative rounded-[20px] border bg-background/95 p-2 transition ${
          showPrompt && !focused ? "animate-pulse border-primary/60 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]" : "border-border/80"
        }`}
      >
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Sparkles className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input
          ref={inputRef}
          dir="ltr"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handOffToAssistant();
            }
          }}
          placeholder={compact ? "AI Search: pages, products, FAQs..." : "Ask anything - pages, products, FAQs, forms, and anchors"}
          className={`border-0 bg-transparent pl-10 pr-10 text-left text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 ${compact ? "h-9 text-sm" : "h-12 text-base"}`}
        />
      </div>

      {showPrompt && !focused && !query && !compact && (
        <div className="mt-3 flex items-center justify-between rounded-[18px] border border-primary/25 bg-primary/10 p-3 text-sm text-foreground shadow-[0_16px_40px_rgba(2,6,23,0.16)]">
          <span>Not finding what you need? Can we help?</span>
          <Button size="sm" className="rounded-full" onClick={() => openAssistant()}>
            Yes, open search
          </Button>
        </div>
      )}
    </div>
  );
};

export default PublicSearchPanel;
