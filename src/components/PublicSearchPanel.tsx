import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { usePublicPageSearch } from "@/hooks/usePublicPageSearch";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { PublicState } from "@/components/public-states/PublicState";
import { LoadingState } from "@/components/public-states/LoadingState";
import { ConnectionNotice } from "@/components/public-states/ConnectionNotice";

export const PublicSearchPanel = ({ compact = false }: { compact?: boolean }) => {
  const { openAssistant } = useCompanionAssistant();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const online = useOnlineStatus();
  const { hits, status, retry } = usePublicPageSearch(query);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncement(status === "ready" ? `${hits.length ? `Showing ${hits.length} page matches` : "No page matches"} for ${query.trim()}.` : ""), 500);
    return () => window.clearTimeout(timer);
  }, [hits.length, query, status]);
  const askIris = () => {
    if (!online) return;
    openAssistant({ query: query.trim() || undefined, autoSubmit: Boolean(query.trim()) });
    inputRef.current?.blur();
  };

  return (
    <div className={compact ? "w-full max-w-[320px] space-y-3" : "w-full space-y-3"}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">Search the site</label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          aria-describedby={`${id}-hint`} aria-controls={`${id}-results`} autoComplete="off"
          placeholder="Try progressive lenses, coatings or retailers" className="h-12 pl-10 text-base" />
      </div>
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">Find pages with two or more characters, or ask Iris for help.</p>
      <p role="status" className="sr-only">{announcement}</p>
      <ConnectionNotice description="Page matches remain available if they have already loaded. Reconnect to ask Iris or open pages that are not loaded." />
      <div id={`${id}-results`} className="space-y-3" aria-busy={status === "loading"}>
        {status === "loading" ? <LoadingState /> : null}
        {status === "error" ? <PublicState tone="error" title="Page search couldn’t load" description="Try loading it again, or browse the lens guide and retailer directory below." announce>
          <Button type="button" variant="outline" onClick={retry}>Try again</Button>
          <Button asChild variant="outline"><Link to="/lenses/lens-types">Explore lenses</Link></Button>
          <Button asChild variant="outline"><Link to="/find-a-retailer">Find a retailer</Link></Button>
        </PublicState> : null}
        {status === "ready" && hits.length === 0 ? <PublicState tone="search" title={`No page matches for “${query.trim()}”`} description="Try a shorter phrase, such as “progressive” or “coatings”, or explore these starting points.">
          <Button type="button" variant="outline" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>Clear search</Button>
          <Button asChild variant="outline"><Link to="/lenses/lens-types">Explore lenses</Link></Button>
          <Button asChild variant="outline"><Link to="/find-a-retailer">Find a retailer</Link></Button>
        </PublicState> : null}
        {status === "ready" && hits.length > 0 ? <ul aria-label="Matching pages" className="divide-y divide-border rounded-xl border border-border bg-card">
          {hits.map((hit) => <li key={hit.path}><Link to={hit.path} className="block rounded-lg p-4 text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
            <span className="font-medium">{hit.title}</span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">{hit.snippet}</span>
          </Link></li>)}
        </ul> : null}
        {status === "idle" || status === "offline" ? <div className="flex flex-wrap gap-3 text-sm">
          <Link className="rounded underline underline-offset-4" to="/lenses/lens-types">Explore lenses</Link>
          <Link className="rounded underline underline-offset-4" to="/find-a-retailer">Find a retailer</Link>
        </div> : null}
      </div>
      <Button type="button" variant="outline" className="min-h-11" disabled={!online} onClick={askIris}>Ask Iris{query.trim() ? " about this" : " for help"}</Button>
    </div>
  );
};

export default PublicSearchPanel;
