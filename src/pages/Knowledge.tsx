import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HelpFeedbackButtons from "@/components/admin/HelpFeedbackButtons";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicKnowledge } from "@/hooks/useContentArticles";
import {
  buildPublicHelpCenterTree,
  extractCanonicalHeadings,
  toKnowledgeArticlePath,
  type HelpCenterNode,
} from "@/lib/helpCenter";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  LayoutGrid,
  Link2,
  Menu,
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
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router";

const HOME_TITLE = "How can we help?";
const HOME_DESCRIPTION =
  "Search guides, browse categories, and jump into the right article or product page without losing your place.";

const nodeMatchesQuery = (node: HelpCenterNode, query: string) => {
  if (!query) return true;
  const haystack = [
    node.title,
    node.summary,
    node.slug,
    ...(node.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
};

const getNodeHref = (node: HelpCenterNode) =>
  node.kind === "article" ? toKnowledgeArticlePath(node.slug) : node.href ?? "/knowledge";

const toPopularSearches = (nodes: HelpCenterNode[]) => {
  const terms = new Set<string>();
  const result: string[] = [];

  for (const node of nodes) {
    for (const keyword of node.keywords ?? []) {
      const trimmed = keyword.trim();
      if (trimmed.length < 4 || terms.has(trimmed)) continue;
      terms.add(trimmed);
      result.push(trimmed);
      if (result.length >= 6) return result;
    }
  }

  return result;
};

const KnowledgeSidebar = ({
  sections,
  searchTerm,
  onSearchChange,
  activeSlug,
}: {
  sections: HelpCenterNode[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeSlug?: string;
}) => (
  <div className="flex h-full flex-col rounded-[1.75rem] border border-border/60 bg-card/85">
    <div className="border-b border-border/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Help Navigation
      </p>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search help"
          className="h-11 rounded-xl border-border/70 pl-9"
        />
      </div>
    </div>
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-5 p-4">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span>{section.title}</span>
              <span className="text-[10px]">{section.children.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {section.children.map((node) => (
                <NavLink
                  key={node.id}
                  to={getNodeHref(node)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-xl px-3 py-2 text-sm transition-colors",
                      (isActive || activeSlug === node.slug) && node.kind === "article"
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-pretty font-medium leading-5">{node.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{node.summary}</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
);

const KnowledgeDetailRail = ({
  node,
}: {
  node: HelpCenterNode | null;
}) => {
  const toc = useMemo(
    () => (node?.kind === "article" ? extractCanonicalHeadings(node.bodyJson) : []),
    [node],
  );

  if (!node) return null;

  return (
    <div className="space-y-5">
      <Card className="border-border/60 bg-card/90">
        <CardContent className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Table of Contents
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {toc.length > 0 ? (
              toc.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={cn(
                    "text-sm text-muted-foreground transition-colors hover:text-foreground",
                    heading.level > 2 && "pl-4",
                  )}
                >
                  {heading.text}
                </a>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                This entry is short-form, so there are no in-page headings to jump between.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {node.kind === "article" ? (
        <Card className="border-border/60 bg-card/90">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Need something more specific?</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Search the help center from the left rail or head back to the collections overview for related topics.
            </p>
            <Button variant="outline" className="mt-4 w-full" asChild>
              <Link to="/knowledge">Browse all help topics</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

const Knowledge = () => {
  const { articleSlug } = useParams<{ articleSlug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: articles = [], isLoading } = usePublicKnowledge();

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());

  const tree = useMemo(() => buildPublicHelpCenterTree(articles), [articles]);
  const selectedNode = articleSlug ? tree.nodeBySlug.get(articleSlug) ?? null : null;

  const filteredSections = useMemo(
    () =>
      tree.sections
        .map((section) => ({
          ...section,
          children: section.children.filter((node) => nodeMatchesQuery(node, deferredSearch)),
        }))
        .filter((section) => section.children.length > 0),
    [deferredSearch, tree.sections],
  );

  const featuredSections = filteredSections.slice(0, 3);
  const allVisibleNodes = filteredSections.flatMap((section) => section.children);
  const popularSearches = useMemo(() => toPopularSearches(allVisibleNodes), [allVisibleNodes]);

  useEffect(() => {
    if (!articleSlug) return;
    if (!selectedNode || selectedNode.kind === "section") {
      navigate("/knowledge", { replace: true });
    }
  }, [articleSlug, navigate, selectedNode]);

  useEffect(() => {
    if (articleSlug || !location.hash) return;

    const hash = location.hash.replace(/^#/, "");
    const matchedNode = tree.nodes.find(
      (node) => node.kind === "article" && node.legacyAnchors.includes(hash),
    );

    if (matchedNode) {
      navigate(toKnowledgeArticlePath(matchedNode.slug), { replace: true });
    }
  }, [articleSlug, location.hash, navigate, tree.nodes]);

  const sidebarSections = deferredSearch ? filteredSections : tree.sections;

  const sidebar = (
    <KnowledgeSidebar
      sections={sidebarSections}
      searchTerm={searchTerm}
      onSearchChange={(value) => {
        startTransition(() => {
          setSearchTerm(value);
        });
      }}
      activeSlug={selectedNode?.slug}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={
          selectedNode?.title
            ? `${selectedNode.title} | Help Center | Classic Visions`
            : "Help Center | Classic Visions"
        }
        description={selectedNode?.summary || HOME_DESCRIPTION}
        canonicalPath={articleSlug ? `/knowledge/${articleSlug}` : "/knowledge"}
      />
      <Header />

      <main id="main-content" className="pb-16 pt-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-3 xl:hidden">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Help Center
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-foreground">
                {selectedNode?.title || HOME_TITLE}
              </h1>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu data-icon="inline-start" />
                  Browse topics
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(90vw,24rem)] p-0">
                <SheetTitle className="sr-only">Help navigation</SheetTitle>
                <div className="h-full p-4">{sidebar}</div>
              </SheetContent>
            </Sheet>
          </div>

          {isLoading ? (
            <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
              <Skeleton className="hidden h-[46rem] rounded-[1.75rem] xl:block" />
              <Skeleton className="h-[46rem] rounded-[1.75rem]" />
            </div>
          ) : articleSlug && selectedNode ? (
            <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)_18rem]">
              <aside className="hidden xl:block xl:sticky xl:top-28 xl:h-[calc(100vh-8rem)]">
                {sidebar}
              </aside>

              <article className="min-w-0 rounded-[1.75rem] border border-border/60 bg-card/85 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Link to="/knowledge" className="hover:text-foreground">
                    Help
                  </Link>
                  <span>/</span>
                  <span>{selectedNode.title}</span>
                </div>

                <div className="mt-6 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {selectedNode.kind === "article" ? "Article" : "Linked page"}
                    </Badge>
                    <Badge variant="secondary">
                      {selectedNode.kind === "article" ? "Published" : "Existing page"}
                    </Badge>
                  </div>

                  <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    {selectedNode.title}
                  </h1>
                  <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                    {selectedNode.summary}
                  </p>
                </div>

                <Separator className="my-8" />

                {selectedNode.kind === "article" ? (
                  <>
                    <div className="max-w-3xl">
                      <WikiArticleRenderer
                        bodyJson={selectedNode.bodyJson as never}
                        legacyContent={selectedNode.content}
                        className="text-base"
                        emptyMessage="This article has no content yet."
                      />
                    </div>

                    <Separator className="my-8" />

                    <div className="max-w-xl rounded-[1.5rem] border border-border/60 bg-muted/25 p-5">
                      <p className="text-lg font-semibold text-foreground">
                        Did this article answer your question?
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Feedback helps us improve the help center and prioritize the next article update.
                      </p>
                      <div className="mt-4">
                        <HelpFeedbackButtons articleId={selectedNode.id} pageSlug="knowledge" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="max-w-3xl rounded-[1.5rem] border border-border/60 bg-muted/25 p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-background">
                        <Link2 className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-foreground">
                          This topic lives on an existing public page.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          We surface it in the help center so it shows up in search and category navigation, but the canonical content still lives on the linked page.
                        </p>
                        <Button className="mt-4" asChild>
                          <Link to={selectedNode.href || "/knowledge"}>
                            Open dedicated page
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </article>

              <aside className="hidden xl:block xl:sticky xl:top-28 xl:h-fit">
                <KnowledgeDetailRail node={selectedNode} />
              </aside>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
              <aside className="hidden xl:block xl:sticky xl:top-28 xl:h-[calc(100vh-8rem)]">
                {sidebar}
              </aside>

              <div className="min-w-0 space-y-8">
                <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/90">
                  <div className="bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] px-6 py-10 sm:px-8 sm:py-14 dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.15),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))]">
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
                      Help Center
                    </Badge>
                    <div className="mt-5 max-w-3xl">
                      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
                        {HOME_TITLE}
                      </h1>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                        {HOME_DESCRIPTION}
                      </p>
                    </div>

                    <div className="mt-8 max-w-3xl rounded-[1.4rem] border border-border/60 bg-background/90 p-3 shadow-sm">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchTerm}
                          onChange={(event) => {
                            const value = event.target.value;
                            startTransition(() => {
                              setSearchTerm(value);
                            });
                          }}
                          placeholder="Search help articles, categories, and existing pages"
                          className="h-14 border-0 bg-transparent pl-12 pr-12 text-base shadow-none focus-visible:ring-0"
                        />
                        <Sparkles className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      </div>
                    </div>

                    {popularSearches.length > 0 ? (
                      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Popular searches:</span>
                        {popularSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => setSearchTerm(term)}
                            className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 transition-colors hover:border-foreground/20 hover:text-foreground"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  {featuredSections.map((section) => (
                    <Card key={section.id} className="overflow-hidden border-border/60 bg-card/90">
                      <CardContent className="p-0">
                        <div className="border-b border-border/60 px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-2xl bg-muted">
                              <LayoutGrid className="h-5 w-5 text-foreground" />
                            </div>
                            <div>
                              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                              <p className="text-sm text-muted-foreground">{section.children.length} topics</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 p-5">
                          <p className="text-sm leading-6 text-muted-foreground">{section.summary}</p>
                          <div className="space-y-1">
                            {section.children.slice(0, 3).map((node) => (
                              <Link
                                key={node.id}
                                to={getNodeHref(node)}
                                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <span className="break-words text-pretty font-medium leading-5">{node.title}</span>
                                <ChevronRight className="h-4 w-4 shrink-0" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </section>

                <section className="space-y-6">
                  {filteredSections.length > 0 ? (
                    filteredSections.map((section) => (
                      <div
                        key={section.id}
                        id={section.slug}
                        className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/85"
                      >
                        <div className="px-6 py-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-2xl">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                {section.title}
                              </p>
                              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                                Browse {section.title.toLowerCase()}
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.summary}</p>
                            </div>
                            <Badge variant="outline">{section.children.length} topics</Badge>
                          </div>
                        </div>
                        <Separator />
                        <div className="divide-y divide-border/50">
                          {section.children.map((node) => (
                            <div
                              key={node.id}
                              id={node.legacyAnchors[0]}
                              className="px-6 py-5"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={node.kind === "article" ? "secondary" : "outline"}>
                                      {node.kind === "article" ? "Article" : "Existing page"}
                                    </Badge>
                                  </div>
                                  <h4 className="mt-3 text-lg font-semibold text-foreground">{node.title}</h4>
                                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                                    {node.summary}
                                  </p>
                                </div>
                                <Button asChild>
                                  <Link to={getNodeHref(node)}>
                                    {node.kind === "article" ? "Read article" : "Open page"}
                                    <ArrowRight data-icon="inline-end" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <Card className="border-dashed border-border/70">
                      <CardContent className="px-6 py-16 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
                          <BookOpen className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h2 className="mt-5 text-2xl font-semibold text-foreground">
                          No topics match "{searchTerm}"
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Try a broader term like progressive, coatings, patient, ordering, or wholesale.
                        </p>
                        <Button
                          variant="outline"
                          className="mt-5"
                          onClick={() => setSearchTerm("")}
                        >
                          Clear search
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Knowledge;
