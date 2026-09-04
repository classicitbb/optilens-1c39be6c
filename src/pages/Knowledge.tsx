import AdminContentEditLink from "@/components/admin/AdminContentEditLink";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HelpFeedbackButtons from "@/components/admin/HelpFeedbackButtons";
import KnowledgeLanding from "@/components/knowledge/KnowledgeLanding";
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
  ChevronRight,
  Link2,
  Menu,
  Search,
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
        {/* The landing renders its own full-bleed hero, so it lives outside
            the container that the article view needs. */}
        {articleSlug ? (
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
                    {selectedNode.kind === "article" && selectedNode.source === "cms" ? (
                      <AdminContentEditLink
                        mode="article"
                        articleId={selectedNode.id}
                        contentType={selectedNode.categoryId === "faq" ? "faq" : "knowledge"}
                      />
                    ) : null}
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
            ) : null}
          </div>
        ) : (
          <KnowledgeLanding />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Knowledge;
