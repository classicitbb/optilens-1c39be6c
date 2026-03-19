import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { retailerMarkets, retailerCountries, retailerSearchIndex, type RetailerMarket } from "@/data/retailers";
import { cn } from "@/lib/utils";
import { Building2, ExternalLink, MapPin, Phone, Search, Sparkles } from "lucide-react";

type RetailerDirectoryProps = {
  featuredMarketSlug?: string;
};

const RetailerDirectory = ({ featuredMarketSlug = "barbados" }: RetailerDirectoryProps) => {
  const [query, setQuery] = useState("");
  const [activeMarketSlug, setActiveMarketSlug] = useState<string>("all");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredMarkets = useMemo(() => {
    const shouldFilterByMarket = activeMarketSlug !== "all";
    const matches = retailerSearchIndex.filter((entry) => {
      if (shouldFilterByMarket && entry.marketSlug !== activeMarketSlug) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return entry.searchValue.includes(normalizedQuery);
    });

    return retailerMarkets.
    map((market) => ({
      ...market,
      entries: matches.
      filter((entry) => entry.marketSlug === market.slug).
      map(({ searchValue: _searchValue, marketName: _marketName, marketSlug: _marketSlug, ...entry }) => entry)
    })).
    filter((market) => market.entries.length > 0 || !normalizedQuery && (!shouldFilterByMarket || market.slug === activeMarketSlug));
  }, [activeMarketSlug, normalizedQuery]);

  const featuredMarket = retailerMarkets.find((market) => market.slug === featuredMarketSlug);
  const totalVisibleEntries = filteredMarkets.reduce((sum, market) => sum + market.entries.length, 0);
  const hasResults = filteredMarkets.some((market) => market.entries.length > 0);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">Patients directory</Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Find a retailer across the Caribbean</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Search by island, store name, clinic type, or location details to find an optical retailer or ophthalmology clinic faster.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[380px]">
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Countries & islands</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{retailerCountries.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visible listings</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{totalVisibleEntries}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Featured market</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{featuredMarket?.name ?? "Barbados"}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-background p-4 sm:p-5">
          <label htmlFor="retailer-search" className="text-sm font-medium text-foreground">
            Search retailers, clinics, or islands
          </label>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="retailer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try Barbados, eye clinic, Harcourt Carter, or Bridgetown"
              className="h-12 pl-10" />
            
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={activeMarketSlug === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveMarketSlug("all")}>
              
              All islands
            </Button>
            {retailerCountries.map((market) =>
            <Button
              key={market.slug}
              type="button"
              variant={activeMarketSlug === market.slug ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveMarketSlug(market.slug)}>
              
                {market.name}
              </Button>
            )}
          </div>
        </div>
      </section>

      {featuredMarket


















      }

      {!hasResults ?
      <section className="rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">No matches found</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">We couldn&apos;t find a listing for that search yet.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Try another island, search for a provider name, or contact Classic Visions so we can help route you to the best nearby retailer.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => {setQuery("");setActiveMarketSlug("all");}}>
              Reset search
            </Button>
            <Button asChild>
              <Link to="/#contact">Contact Classic Visions</Link>
            </Button>
          </div>
        </section> :
      null}

      <div className="space-y-8">
        {filteredMarkets.map((market) =>
        <MarketSection
          key={market.slug}
          market={market}
          isFiltered={Boolean(normalizedQuery) || activeMarketSlug !== "all"} />

        )}
      </div>
    </div>);

};

const MarketSection = ({ market, isFiltered }: {market: RetailerMarket;isFiltered: boolean;}) => {
  const hasEntries = market.entries.length > 0;

  return (
    <section className="scroll-mt-28" id={market.slug}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline">{market.heroBadge}</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">{market.name}</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">{market.intro}</p>
        </div>
        {market.slug === "barbados" ?
        <Button variant="outline" asChild>
            <Link to="/find-a-retailer/barbados">View Barbados SEO page</Link>
          </Button> :
        null}
      </div>

      {hasEntries ?
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {market.entries.map((entry) =>
        <Card key={`${market.slug}-${entry.name}-${entry.location}`} className="h-full rounded-2xl border-border shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{entry.name}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">{entry.category}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{entry.location}</span>
                </div>
                {entry.phone ?
            <a href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{entry.phone}</span>
                  </a> :
            null}
                {entry.notes ?
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{entry.notes}</p> :
            null}
                <div className="flex flex-wrap gap-2 pt-2">
                  {entry.website ?
              <Button size="sm" asChild>
                      <a href={entry.website} target={entry.website.startsWith("http") ? "_blank" : undefined} rel={entry.website.startsWith("http") ? "noopener noreferrer" : undefined}>
                        Visit website
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button> :

              <Button size="sm" variant="outline" asChild>
                      <Link to="/#contact">Request help</Link>
                    </Button>
              }
                </div>
              </CardContent>
            </Card>
        )}
        </div> :

      <div className={cn(
        "rounded-3xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground shadow-sm",
        isFiltered && "border-primary/40"
      )}>
          <p className="font-medium text-foreground">We&apos;re expanding in {market.name}.</p>
          <p className="mt-2 max-w-3xl">
            If you don&apos;t see the retailer you need, contact Classic Visions and we&apos;ll help route you to the closest partner, specialist clinic, or suitable alternative.
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <Link to="/#contact">Contact Classic Visions</Link>
          </Button>
        </div>
      }
    </section>);

};

export default RetailerDirectory;