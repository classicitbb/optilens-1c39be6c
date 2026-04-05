import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HelpFeedbackButtons from "@/components/admin/HelpFeedbackButtons";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CURATED_KNOWLEDGE_ARTICLES,
  KNOWLEDGE_CATEGORY_META,
  KNOWLEDGE_CATEGORY_ORDER,
  KNOWLEDGE_FEATURED_IDS,
  type KnowledgeAudience,
  type KnowledgeCategoryId,
  formatKnowledgeCategoryTitle,
  resolveKnowledgeCategoryId,
} from "@/data/knowledgeCenter";
import { type ContentArticle, usePublicKnowledge } from "@/hooks/useContentArticles";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  HelpCircle,
  LayoutGrid,
  Link2,
  Search,
  Sparkles,
} from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router";

type CategoryFilter = KnowledgeCategoryId | "all";

type LinkedKnowledgeEntry = (typeof CURATED_KNOWLEDGE_ARTICLES)[number] & {
  kind: "linked";
  anchorId: string;
  searchText: string;
};

type CmsKnowledgeEntry = {
  kind: "cms";
  id: string;
  title: string;
  description: string;
  categoryId: KnowledgeCategoryId;
  audience: KnowledgeAudience;
  estimatedReadMinutes: number;
  featured: boolean;
  anchorId: string;
  searchText: string;
  article: ContentArticle;
};

type KnowledgeEntry = LinkedKnowledgeEntry | CmsKnowledgeEntry;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getAudienceLabel = (audience: KnowledgeAudience) => {
  if (audience === "patients") return "Patients";
  if (audience === "professionals") return "Professionals";
  return "All audiences";
};

const getEntryActionLabel = (entry: KnowledgeEntry) =>
  entry.kind === "cms" ? "Preview article" : "Open page";

const getSearchTextForArticle = (article: ContentArticle) =>
  [
    article.title,
    article.description,
    article.category,
    article.page_slug,
    article.content,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const getEstimatedReadMinutes = (article: ContentArticle) => {
  const wordCount = article.content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(wordCount / 220) || 2);
};

const Knowledge = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(KNOWLEDGE_FEATURED_IDS[0] ?? null);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const { data: articles = [], isLoading } = usePublicKnowledge();

  const linkedEntries = useMemo<LinkedKnowledgeEntry[]>(
    () =>
      CURATED_KNOWLEDGE_ARTICLES.map((article) => ({
        ...article,
        kind: "linked",
        anchorId: article.id,
        searchText: [
          article.title,
          article.description,
          article.categoryId,
          article.audience,
          article.keywords.join(" "),
          article.href,
        ]
          .join(" ")
          .toLowerCase(),
      })),
    [],
  );

  const cmsEntries = useMemo<CmsKnowledgeEntry[]>(
    () =>
      articles.map((article) => {
        const categoryId =
          article.content_type === "faq" ? "faq" : resolveKnowledgeCategoryId(article.category);
        return {
          kind: "cms",
          id: article.id,
          title: article.title,
          description:
            article.description ||
            `Published article in ${formatKnowledgeCategoryTitle(article.category || "knowledge")}.`,
          categoryId,
          audience: "all",
          estimatedReadMinutes: getEstimatedReadMinutes(article),
          featured: false,
          anchorId: article.page_slug || slugify(article.title),
          searchText: getSearchTextForArticle(article),
          article,
        };
      }),
    [articles],
  );

  const allEntries = useMemo<KnowledgeEntry[]>(() => [...linkedEntries, ...cmsEntries], [cmsEntries, linkedEntries]);

  const featuredEntries = useMemo(
    () => allEntries.filter((entry) => KNOWLEDGE_FEATURED_IDS.includes(entry.id)).slice(0, 6),
    [allEntries],
  );

  const filteredEntries = useMemo(() => {
    const normalizedQuery = deferredSearchTerm.trim().toLowerCase();

    return allEntries.filter((entry) => {
      const categoryMatch = activeCategory === "all" || entry.categoryId === activeCategory;
      if (!categoryMatch) return false;
      if (!normalizedQuery) return true;
      return entry.searchText.includes(normalizedQuery);
    });
  }, [activeCategory, allEntries, deferredSearchTerm]);

  const categories = useMemo(
    () =>
      KNOWLEDGE_CATEGORY_ORDER.map((categoryId) => {
        const items = allEntries.filter((entry) => entry.categoryId === categoryId);
        return {
          meta: KNOWLEDGE_CATEGORY_META[categoryId],
          entries: items,
        };
      }).filter((category) => category.entries.length > 0),
    [allEntries],
  );

  const filteredCategories = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          entries: filteredEntries.filter((entry) => entry.categoryId === category.meta.id),
        }))
        .filter((category) => category.entries.length > 0),
    [categories, filteredEntries],
  );

  const selectedEntry = useMemo(() => {
    if (!filteredEntries.length) return null;
    return filteredEntries.find((entry) => entry.id === activeArticleId) ?? filteredEntries[0];
  }, [activeArticleId, filteredEntries]);

  useEffect(() => {
    if (!filteredEntries.length) {
      setActiveArticleId(null);
      return;
    }

    if (!selectedEntry) {
      setActiveArticleId(filteredEntries[0]?.id ?? null);
    }
  }, [filteredEntries, selectedEntry]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const matchedEntry = allEntries.find((entry) => entry.anchorId === hash);
    if (matchedEntry) {
      setActiveArticleId(matchedEntry.id);
    }
  }, [allEntries]);

  const totalArticles = allEntries.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" className="pb-16 pt-24">
        <div className="container mx-auto px-4 lg:px-8">
          <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/95 shadow-soft">
            <div className="grid gap-10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.82))] px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_22rem] lg:px-10 lg:py-12 dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))]">
              <div className="max-w-3xl">
                <Badge variant="secondary" className="mb-4 w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]">
                  Help Center
                </Badge>
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Find answers fast, then dive into the right article.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Browse a cleaner, better organized knowledge base with lens education, coating guidance,
                  patient support, trade resources, and linked product pages already used across the site.
                </p>

                <div className="mt-8 max-w-3xl rounded-2xl border border-border/60 bg-background/90 p-3 shadow-sm backdrop-blur">
                  <label htmlFor="knowledge-search" className="sr-only">
                    Search the knowledge base
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="knowledge-search"
                      placeholder="Search topics, products, FAQs, and guides"
                      value={searchTerm}
                      onChange={(event) => {
                        const value = event.target.value;
                        startTransition(() => {
                          setSearchTerm(value);
                        });
                      }}
                      className="h-14 rounded-xl border-0 bg-transparent pl-12 pr-12 text-base shadow-none focus-visible:ring-0"
                    />
                    <Sparkles className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    variant={activeCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory("all")}
                  >
                    All topics
                  </Button>
                  {categories.map(({ meta, entries }) => {
                    const Icon = meta.icon;
                    return (
                      <Button
                        key={meta.id}
                        variant={activeCategory === meta.id ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setActiveCategory(meta.id)}
                      >
                        <Icon className="h-4 w-4" />
                        {meta.title}
                        <span className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {entries.length}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Card className="border-border/60 bg-background/85 shadow-medium">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    Knowledge at a glance
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-3xl font-semibold text-foreground">{totalArticles}</p>
                      <p className="mt-1 text-sm text-muted-foreground">articles and linked guides</p>
                    </div>
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-3xl font-semibold text-foreground">{categories.length}</p>
                      <p className="mt-1 text-sm text-muted-foreground">organized categories</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border/60 bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Popular starting points</p>
                    <div className="mt-3 space-y-3">
                      {featuredEntries.slice(0, 3).map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setActiveArticleId(entry.id)}
                          className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{entry.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{entry.description}</p>
                          </div>
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            {categories.slice(0, 3).map(({ meta, entries }) => {
              const Icon = meta.icon;
              return (
                <Card key={meta.id} className="overflow-hidden border-border/60 bg-card/90">
                  <CardContent className="p-0">
                    <div className={cn("bg-gradient-to-r p-5", meta.accentClassName)}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/85 shadow-sm">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-foreground">{meta.title}</h2>
                          <p className="text-sm text-muted-foreground">{entries.length} resources</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 p-5">
                      <p className="text-sm leading-6 text-muted-foreground">{meta.description}</p>
                      <div className="space-y-2">
                        {entries.slice(0, 3).map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => setActiveArticleId(entry.id)}
                            className="flex w-full items-center justify-between rounded-xl border border-border/60 px-3 py-3 text-left text-sm transition-colors hover:bg-muted"
                          >
                            <span className="font-medium text-foreground">{entry.title}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Browse Articles</p>
                  <h2 className="mt-1 text-2xl font-semibold text-foreground">
                    {filteredEntries.length} result{filteredEntries.length === 1 ? "" : "s"}
                  </h2>
                </div>
                {(searchTerm || activeCategory !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveCategory("all");
                    }}
                  >
                    Reset filters
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-48 rounded-3xl" />
                  ))}
                </div>
              ) : filteredCategories.length > 0 ? (
                <div className="space-y-6">
                  {filteredCategories.map(({ meta, entries }) => {
                    const Icon = meta.icon;
                    return (
                      <section
                        key={meta.id}
                        id={meta.id}
                        className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card scroll-mt-28"
                      >
                        <div className={cn("bg-gradient-to-r px-6 py-5", meta.accentClassName)}>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/90 shadow-sm">
                                <Icon className="h-5 w-5 text-foreground" />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-foreground">{meta.title}</h3>
                                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-background/80">
                              {entries.length} article{entries.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                        </div>

                        <div className="divide-y divide-border/50">
                          {entries.map((entry) => {
                            const isSelected = selectedEntry?.id === entry.id;
                            return (
                              <article
                                key={entry.id}
                                id={entry.anchorId}
                                className={cn(
                                  "scroll-mt-28 px-6 py-5 transition-colors",
                                  isSelected && "bg-primary/5",
                                )}
                              >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant={entry.kind === "cms" ? "secondary" : "outline"}>
                                        {entry.kind === "cms" ? "Inline article" : "Linked page"}
                                      </Badge>
                                      <Badge variant="outline">{getAudienceLabel(entry.audience)}</Badge>
                                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        {entry.estimatedReadMinutes} min
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setActiveArticleId(entry.id)}
                                      className="mt-3 text-left"
                                    >
                                      <h4 className="text-lg font-semibold text-foreground transition-colors hover:text-primary">
                                        {entry.title}
                                      </h4>
                                    </button>
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                                      {entry.description}
                                    </p>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setActiveArticleId(entry.id)}
                                    >
                                      {getEntryActionLabel(entry)}
                                    </Button>
                                    {entry.kind === "linked" && (
                                      <Button size="sm" asChild>
                                        <Link to={entry.href}>
                                          Go to page
                                          <ArrowRight className="h-4 w-4" />
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed border-border/70">
                  <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-foreground">No results for "{deferredSearchTerm}"</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      Try a broader term like progressive, coatings, blue light, wholesale, or patient care.
                    </p>
                    <Button
                      className="mt-5"
                      onClick={() => {
                        setSearchTerm("");
                        setActiveCategory("all");
                      }}
                    >
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <aside className="xl:sticky xl:top-28 xl:self-start">
              <Card className="border-border/60 bg-card/95 shadow-medium">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                    {selectedEntry?.kind === "cms" ? <BookOpen className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                    Article Focus
                  </div>

                  {selectedEntry ? (
                    <div className="mt-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {KNOWLEDGE_CATEGORY_META[selectedEntry.categoryId]?.title ?? "Knowledge"}
                        </Badge>
                        <Badge variant="outline">{getAudienceLabel(selectedEntry.audience)}</Badge>
                      </div>

                      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                        {selectedEntry.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedEntry.description}</p>

                      {selectedEntry.kind === "linked" ? (
                        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-5">
                          <p className="text-sm font-medium text-foreground">This topic already has a dedicated page.</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            We added it here as a help article entry point so visitors can discover it from search and categories without duplicating content.
                          </p>
                          <Button className="mt-4 w-full" asChild>
                            <Link to={selectedEntry.href}>
                              Open dedicated page
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="mt-6 max-h-[28rem] overflow-auto rounded-2xl border border-border/60 bg-background p-5">
                            <WikiArticleRenderer
                              bodyJson={selectedEntry.article.body_json as never}
                              legacyContent={selectedEntry.article.content}
                              className="text-sm"
                            />
                          </div>
                          <div className="mt-4">
                            <HelpFeedbackButtons articleId={selectedEntry.article.id} pageSlug="knowledge" />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        Select an article to preview it here.
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Use the category sections on the left to browse, or search above to jump straight to a topic.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Knowledge;
