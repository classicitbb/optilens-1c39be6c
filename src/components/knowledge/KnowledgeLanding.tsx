import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Clock, CornerDownLeft, FileText, ImageIcon, Search, Sparkles, X } from "lucide-react";

import AdminContentEditLink from "@/components/admin/AdminContentEditLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePublicBlogPosts } from "@/hooks/useBlogPosts";
import { cn } from "@/lib/utils";
import { KNOWLEDGE_CATEGORY_META, type KnowledgeAudience } from "@/data/knowledgeCenter";
import {
  matchesQuery,
  nodeHref,
  useKnowledgeCenterData,
  type EnrichedNode,
} from "@/components/knowledge/knowledgeCenterData";
import { usePageSearch } from "@/components/knowledge/usePageSearch";
import { Highlighted } from "@/components/knowledge/PageHits";
import type { PageSearchHit } from "@/lib/publicSiteSearch";

/* -------------------------------------------------------------------------- */
/*  Knowledge base landing page                                                */
/*                                                                            */
/*  People arrive with a question, not a desire to browse, so search is the    */
/*  hero and covers the whole public site - knowledge articles AND the prose   */
/*  of every public page (see lib/publicSiteSearch). The audience switch       */
/*  (Patients / Professionals) is the primary filter, because those two groups */
/*  want almost disjoint halves of this library.                               */
/*                                                                            */
/*  Categories are a selectable filter rather than a second scrolling list, so */
/*  the page is the same shape on a phone as on a desktop.                     */
/* -------------------------------------------------------------------------- */

const AUDIENCE_TABS: { id: KnowledgeAudience | "all-audiences"; label: string; short: string }[] = [
  { id: "all-audiences", label: "Everything", short: "All" },
  { id: "patients", label: "For patients", short: "Patients" },
  { id: "professionals", label: "For professionals", short: "Pros" },
];

const QUICK_QUESTIONS = ["progressive", "anti-reflective", "returns", "photochromic", "delivery", "myopia"];

const ArticleRow = ({ node, query }: { node: EnrichedNode; query: string }) => {
  const category = KNOWLEDGE_CATEGORY_META[node.categoryId];
  const Icon = category.icon;
  const matchStart = query ? node.title.toLowerCase().indexOf(query) : -1;

  return (
    // Relative wrapper so the admin edit affordance can sit above the row link
    // rather than nesting a second interactive element inside it.
    <div className="relative border-b border-border/50 last:border-b-0">
    <Link
      to={nodeHref(node)}
      className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:items-center sm:gap-4"
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
          category.accentClassName,
        )}
      >
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-foreground">
          <Highlighted text={node.title} start={matchStart} length={query.length} />
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground sm:line-clamp-1">
          {node.summary}
        </p>
        {/* Meta moves under the title on narrow screens instead of disappearing. */}
        <p className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground sm:hidden">
          <span>{category.title}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{node.readMinutes} min</span>
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-3 text-[11px] text-muted-foreground sm:flex">
        <span>{category.title}</span>
        <span className="flex items-center gap-1 tabular-nums">
          <Clock className="h-3 w-3" />
          {node.readMinutes}m
        </span>
      </div>
      <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
    </Link>
    {node.kind === "article" && node.source === "cms" ? (
      <AdminContentEditLink
        mode="article"
        articleId={node.id}
        contentType={node.categoryId === "faq" ? "faq" : "knowledge"}
        className="absolute right-3 top-2.5 h-7 rounded-full px-2 text-[11px]"
      />
    ) : null}
    </div>
  );
};

/** A match found in the prose of an ordinary public page, not a help article. */
const PageRow = ({ hit }: { hit: PageSearchHit }) => (
  <Link
    to={hit.path}
    className="group flex items-start gap-3 border-b border-border/50 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/50 sm:gap-4"
  >
    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
      {hit.viaAltText ? (
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium leading-5 text-foreground">{hit.title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
        <Highlighted text={hit.snippet} start={hit.matchStart} length={hit.matchLength} />
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-mono">{hit.path}</span>
        {hit.viaAltText ? <span className="text-primary">matched image description</span> : null}
        {hit.matchCount > 1 ? <span>{hit.matchCount} mentions</span> : null}
      </p>
    </div>
    <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
  </Link>
);

const KnowledgeLanding = () => {
  const { sections, all, featured, totalCount, isLoading } = useKnowledgeCenterData();
  const { data: blogPosts = [] } = usePublicBlogPosts("blog_post");
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<KnowledgeAudience | "all-audiences">("all-audiences");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const normalized = query.trim().toLowerCase();
  const searching = normalized.length > 0;
  const pageHits = usePageSearch(query);

  const inAudience = useMemo(
    () => (node: EnrichedNode) =>
      audience === "all-audiences" || node.audience === audience || node.audience === "all",
    [audience],
  );

  const results = useMemo(
    () => all.filter((node) => inAudience(node) && matchesQuery(node, normalized)),
    [all, inAudience, normalized],
  );

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({ ...section, children: section.children.filter(inAudience) }))
        .filter((section) => section.children.length > 0),
    [inAudience, sections],
  );

  // Default to the first category rather than rendering every list at once -
  // that duplication is what made the old layout unusable on a phone.
  const openSection =
    visibleSections.find((section) => section.id === activeCategory) ?? visibleSections[0] ?? null;

  if (isLoading) {
    return <div className="p-12 text-sm text-muted-foreground">Loading knowledge base...</div>;
  }

  return (
    <div>
      {/* Hero: the search field is the page, not an accessory to it. */}
      <div className="border-b border-border/60 bg-gradient-to-b from-primary/[0.07] to-transparent">
        <div className="container mx-auto px-4 py-9 text-center sm:py-14 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What do you need to know?
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-sm leading-6 text-muted-foreground">
            {totalCount} guides plus every page on the site - searchable in one place.
          </p>

          <div className="relative mx-auto mt-6 max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lenses, coatings, policies, or any page"
              aria-label="Search the knowledge base and site"
              className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-11 text-base shadow-sm sm:h-14 sm:pl-12 sm:pr-12"
            />
            {searching ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <CornerDownLeft className="pointer-events-none absolute right-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground sm:block" />
            )}
          </div>

          {/* Horizontally scrollable on a phone rather than wrapping to 3 rows. */}
          <div className="mx-auto mt-4 flex max-w-2xl gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
            <span className="hidden shrink-0 self-center text-xs text-muted-foreground sm:inline">
              Common:
            </span>
            {QUICK_QUESTIONS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="shrink-0 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Audience switch: full-width segmented control on mobile. */}
          <div
            role="tablist"
            aria-label="Filter by audience"
            className="mx-auto mt-6 grid w-full max-w-sm grid-cols-3 rounded-full border border-border/60 bg-background/80 p-1 sm:inline-flex sm:w-auto sm:max-w-none"
          >
            {AUDIENCE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={audience === tab.id}
                onClick={() => setAudience(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-full px-2 py-2 text-xs font-medium transition-colors sm:px-4 sm:py-1.5",
                  audience === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-10 lg:px-8">
        {searching ? (
          <div className="mx-auto max-w-3xl space-y-8">
            <section>
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {results.length} {results.length === 1 ? "article" : "articles"}
              </p>
              {results.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
                  {results.map((node) => (
                    <ArticleRow key={node.id} node={node} query={normalized} />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center text-sm text-muted-foreground">
                  No knowledge articles match that.
                </p>
              )}
            </section>

            {/* Matches in ordinary site pages - headings, body copy, alt text. */}
            {pageHits.length > 0 ? (
              <section>
                <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {pageHits.length} {pageHits.length === 1 ? "page" : "pages"} on this site
                </p>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
                  {pageHits.map((hit) => (
                    <PageRow key={hit.path} hit={hit} />
                  ))}
                </div>
              </section>
            ) : null}

            {results.length === 0 && pageHits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 px-6 py-14 text-center">
                <p className="text-sm font-medium text-foreground">Nothing found anywhere on the site.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a broader word, or switch the audience filter back to All.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto max-w-5xl">
            {featured.length > 0 ? (
              <section>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Most read</h2>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {featured.slice(0, 4).map((node) => (
                    <Link
                      key={node.id}
                      to={nodeHref(node)}
                      className="flex flex-col rounded-2xl border border-border/60 bg-card/60 p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <p className="text-sm font-medium leading-5 text-foreground">{node.title}</p>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {node.summary}
                      </p>
                      <p className="mt-auto pt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {node.readMinutes} min read
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Category chips select which list is shown, so exactly one list
                renders at a time - identical behaviour on phone and desktop. */}
            <section className="mt-10">
              <h2 className="text-sm font-semibold text-foreground">Browse by topic</h2>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible">
                {visibleSections.map((section) => {
                  const Icon = section.meta.icon;
                  const isOpen = openSection?.id === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveCategory(section.id)}
                      aria-pressed={isOpen}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                        isOpen
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {section.title}
                      <span className="tabular-nums opacity-70">{section.children.length}</span>
                    </button>
                  );
                })}
              </div>

              {openSection ? (
                <div className="mt-4">
                  <p className="text-xs leading-5 text-muted-foreground">{openSection.description}</p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-card/60">
                    {openSection.children.map((node) => (
                      <ArticleRow key={node.id} node={node} query="" />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center text-sm text-muted-foreground">
                  No articles for this audience yet.
                </p>
              )}
            </section>

            {/* Editorial posts live alongside the knowledge base rather than
                inside it, so surface them here instead of stranding /blog. */}
            {blogPosts.length > 0 ? (
              <section className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">From the blog</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Longer-form eyecare and Caribbean optical-business writing.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/blog">
                      Open blog
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {blogPosts.slice(0, 3).map((post) => (
                    <div
                      key={post.id}
                      className="relative rounded-2xl border border-border/60 bg-card/60 p-4 transition-colors hover:border-primary/40"
                    >
                      <Link to={`/blog/${post.slug}`} className="block">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{post.category || "Blog post"}</Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {post.published_at
                              ? new Date(post.published_at).toLocaleDateString()
                              : "Draft"}
                          </span>
                        </div>
                        <h3 className="mt-2.5 text-sm font-medium leading-5 text-foreground">
                          {post.title}
                        </h3>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {post.excerpt}
                        </p>
                      </Link>
                      <AdminContentEditLink
                        mode="blog"
                        blogId={post.id}
                        className="absolute right-3 top-3 h-7 rounded-full px-2 text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeLanding;
