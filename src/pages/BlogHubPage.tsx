import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicBlogPosts, type BlogEntryType } from "@/hooks/useBlogPosts";
import { ArrowRight, CalendarDays, Search, Sparkles } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";

const formatPublishDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Draft";

const BlogHubPage = () => {
  const { data: entries = [], isLoading } = usePublicBlogPosts();
  const [search, setSearch] = useState("");
  const [entryType, setEntryType] = useState<"all" | BlogEntryType>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const tags = useMemo(() => {
    const values = new Set<string>();
    for (const entry of entries) {
      for (const tag of entry.tags ?? []) values.add(tag);
    }
    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (entryType !== "all" && entry.entry_type !== entryType) return false;
      if (selectedTag !== "all" && !(entry.tags ?? []).includes(selectedTag)) return false;
      if (!deferredSearch) return true;
      const haystack = [
        entry.title,
        entry.excerpt,
        entry.author_name,
        entry.category,
        ...(entry.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(deferredSearch);
    });
  }, [deferredSearch, entries, entryType, selectedTag]);

  const lead = filtered[0] ?? null;
  const secondary = filtered.slice(1, 4);
  const grid = filtered.slice(4);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Blog | Classic Visions"
        description="Editorial stories, optical business insight, eyecare education, and future newsletters from Classic Visions."
        canonicalPath="/blog"
      />
      <Header />

      <main id="main-content" className="pb-16 pt-24">
        <div className="container mx-auto px-4 lg:px-8">
          <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/90">
            <div className="bg-[radial-gradient(circle_at_top_left,rgba(231,179,24,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(42,94,139,0.16),transparent_30%),linear-gradient(180deg,rgba(255,250,240,0.96),rgba(255,255,255,0.88))] px-6 py-8 sm:px-8 sm:py-10">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
                Classic Visions Editorial
              </Badge>
              <div className="mt-3 max-w-4xl">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Our Blog: Stories, optical insight, and our newsletters.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Explore Caribbean-focused eyecare education, business guidance, patient-facing explainers, and published newsletters.
                </p>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-border/60 bg-background/90 p-3 shadow-sm">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search articles, tags, categories, and authors"
                    className="h-14 border-0 bg-transparent pl-12 pr-12 text-base shadow-none focus-visible:ring-0"
                  />
                  <Sparkles className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { label: "All", value: "all" as const },
                  { label: "Blog Posts", value: "blog_post" as const },
                  { label: "Newsletters", value: "newsletter" as const },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={entryType === option.value ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setEntryType(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedTag === "all" ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setSelectedTag("all")}
                  >
                    All tags
                  </Button>
                  {tags.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant={selectedTag === tag ? "secondary" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => setSelectedTag(tag)}
                    >
                      #{tag}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {isLoading ? (
            <div className="mt-8 space-y-4">
              <Skeleton className="h-[28rem] rounded-[1.75rem]" />
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-64 rounded-[1.5rem]" />
                <Skeleton className="h-64 rounded-[1.5rem]" />
                <Skeleton className="h-64 rounded-[1.5rem]" />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="mt-8 border-dashed border-border/70">
              <CardContent className="px-6 py-16 text-center">
                <h2 className="text-2xl font-semibold text-foreground">No entries match this view</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Try a broader term or switch filters to see blog posts and newsletter-ready content.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {lead ? (
                <section className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_24rem]">
                  <Link
                    to={`/blog/${lead.slug}`}
                    className="group overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/90"
                  >
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      {lead.cover_image_url ? (
                        <img
                          src={lead.cover_image_url}
                          alt={lead.cover_image_alt || lead.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </div>
                    <div className="space-y-4 p-6 sm:p-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {lead.entry_type === "newsletter" ? "Newsletter" : lead.category || "Blog Post"}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          {formatPublishDate(lead.published_at)}
                        </span>
                      </div>
                      <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        {lead.title}
                      </h2>
                      <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                        {lead.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                        <span>{lead.author_name || "Classic Visions"}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>

                  <div className="grid gap-4">
                    {secondary.map((entry) => (
                      <Link
                        key={entry.id}
                        to={`/blog/${entry.slug}`}
                        className="group rounded-[1.5rem] border border-border/60 bg-card/90 p-5 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{entry.entry_type === "newsletter" ? "Newsletter" : entry.category || "Article"}</Badge>
                          <span className="text-xs text-muted-foreground">{formatPublishDate(entry.published_at)}</span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-foreground">{entry.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.excerpt}</p>
                        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
                          <span>Read story</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Browse the archive
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-foreground">More from Classic Visions</h2>
                  </div>
                  <Badge variant="outline">{filtered.length} results</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {grid.map((entry) => (
                    <Link key={entry.id} to={`/blog/${entry.slug}`} className="group">
                      <Card className="h-full overflow-hidden border-border/60 bg-card/90 transition-colors group-hover:bg-muted/30">
                        {entry.cover_image_url ? (
                          <div className="aspect-[16/10] overflow-hidden bg-muted">
                            <img
                              src={entry.cover_image_url}
                              alt={entry.cover_image_alt || entry.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          </div>
                        ) : null}
                        <CardContent className="p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{entry.category || "Article"}</Badge>
                            <span className="text-xs text-muted-foreground">{formatPublishDate(entry.published_at)}</span>
                          </div>
                          <h3 className="mt-4 text-xl font-semibold text-foreground">{entry.title}</h3>
                          <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{entry.excerpt}</p>
                          {(entry.tags ?? []).length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {(entry.tags ?? []).slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogHubPage;
