import { HelpCenterDetailRail, HelpCenterSidebar, nodeMatchesQuery } from "@/components/knowledge/HelpCenterNav";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useSopArticles } from "@/hooks/useContentArticles";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useWikiHeadings } from "@/hooks/useWikiHeadings";
import { SOP_BASE_PATH, buildSopTree, toSopArticlePath, type HelpCenterNode } from "@/lib/helpCenter";
import { toAdminWikiArticlePath } from "@/lib/wikiArticleRouting";
import { ArrowRight, ChevronRight, ClipboardList, Link2, Menu, Pencil, Search } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

const getNodeHref = (node: HelpCenterNode) =>
  node.kind === "article" ? toSopArticlePath(node.slug) : node.href ?? SOP_BASE_PATH;

const formatUpdated = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;

const AdminSopsPage = () => {
  const { articleSlug } = useParams<{ articleSlug?: string }>();
  const navigate = useNavigate();
  const { canView, canEditFeature, isLoading: permissionsLoading } = useRolePermissions();
  const canRead = canView("wiki");
  const canEdit = canEditFeature("wiki");
  const { headings } = useWikiHeadings();
  const { data: articles = [], isLoading } = useSopArticles(canRead);

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());

  const tree = useMemo(() => buildSopTree(headings, articles), [articles, headings]);
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
  const visibleSections = deferredSearch ? filteredSections : tree.sections;

  useEffect(() => {
    if (!articleSlug || isLoading || !canRead) return;
    if (!selectedNode) navigate(SOP_BASE_PATH, { replace: true });
  }, [articleSlug, canRead, isLoading, navigate, selectedNode]);

  const onSearchChange = (value: string) => {
    startTransition(() => {
      setSearchTerm(value);
    });
  };

  if (!permissionsLoading && !canRead) {
    return (
      <div className="p-6">
        <Card className="mx-auto max-w-xl border-border/60">
          <CardContent className="p-6">
            <p className="text-lg font-semibold text-foreground">SOPs are not available for your role</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask an administrator to grant Wiki view access in Settings → Roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sidebar = (
    <HelpCenterSidebar
      sections={visibleSections}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      activeSlug={selectedNode?.slug}
      getNodeHref={getNodeHref}
      label="SOPs"
      searchPlaceholder="Search SOPs"
    />
  );

  if (!articleSlug) {
    const articleCount = tree.nodes.filter((node) => node.kind !== "section").length;
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 lg:p-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">SOPs</h1>
                <p className="text-sm text-muted-foreground">
                  Standard operating procedures and internal guides for running the office.
                </p>
              </div>
            </div>
            {canEdit ? (
              <Button variant="outline" asChild>
                <Link to="/admin/knowledge/wiki">
                  <Pencil data-icon="inline-start" />
                  Manage in Wiki
                </Link>
              </Button>
            ) : null}
          </div>
          <div className="relative max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={`Search ${articleCount} procedures`}
              className="h-12 rounded-xl pl-9 text-base"
              autoFocus
            />
          </div>
        </div>

        {isLoading || permissionsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-48 rounded-[1.5rem]" />
            ))}
          </div>
        ) : visibleSections.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="p-6 text-sm text-muted-foreground">
              {deferredSearch
                ? `No SOPs match "${searchTerm.trim()}".`
                : "No SOPs have been published yet. Publish internal articles from the Wiki to list them here."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleSections.map((section) => (
              <Card key={section.id} className="border-border/60 bg-card/85">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {section.title}
                    </p>
                    <Badge variant="secondary">{section.children.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    {section.children.map((node) => (
                      <Link
                        key={node.id}
                        to={getNodeHref(node)}
                        className="group flex items-start justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium leading-5 text-foreground">{node.title}</p>
                          {node.summary ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{node.summary}</p>
                          ) : null}
                        </div>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const section = selectedNode ? tree.sections.find((entry) => entry.children.includes(selectedNode)) : null;
  const updated = formatUpdated(selectedNode?.updatedAt);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 xl:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to={SOP_BASE_PATH}>All SOPs</Link>
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu data-icon="inline-start" />
              Browse SOPs
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(90vw,24rem)] p-0">
            <SheetTitle className="sr-only">SOP navigation</SheetTitle>
            <div className="h-full p-4">{sidebar}</div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading || !selectedNode ? (
        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <Skeleton className="hidden h-[46rem] rounded-[1.75rem] xl:block" />
          <Skeleton className="h-[46rem] rounded-[1.75rem]" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)_18rem]">
          <aside className="hidden xl:block xl:sticky xl:top-4 xl:h-[calc(100vh-8rem)]">{sidebar}</aside>

          <article className="min-w-0 rounded-[1.75rem] border border-border/60 bg-card/85 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link to={SOP_BASE_PATH} className="hover:text-foreground">
                SOPs
              </Link>
              <span>/</span>
              {section ? (
                <>
                  <span>{section.title}</span>
                  <span>/</span>
                </>
              ) : null}
              <span>{selectedNode.title}</span>
            </div>

            <div className="mt-6 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{selectedNode.kind === "article" ? "Procedure" : "Linked page"}</Badge>
                {updated ? <Badge variant="secondary">Updated {updated}</Badge> : null}
                {canEdit ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      to={toAdminWikiArticlePath({
                        id: selectedNode.id,
                        title: selectedNode.title,
                        slug: selectedNode.slug,
                      })}
                    >
                      <Pencil data-icon="inline-start" />
                      Edit
                    </Link>
                  </Button>
                ) : null}
              </div>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {selectedNode.title}
              </h1>
              {selectedNode.summary ? (
                <p className="mt-4 text-base leading-7 text-muted-foreground">{selectedNode.summary}</p>
              ) : null}
            </div>

            <Separator className="my-8" />

            {selectedNode.kind === "article" ? (
              <div className="max-w-3xl">
                <WikiArticleRenderer
                  bodyJson={selectedNode.bodyJson as never}
                  legacyContent={selectedNode.content}
                  className="text-base"
                  emptyMessage="This procedure has no content yet."
                />
              </div>
            ) : (
              <div className="max-w-3xl rounded-[1.5rem] border border-border/60 bg-muted/25 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-background">
                    <Link2 className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-foreground">This procedure lives on another page.</p>
                    <Button className="mt-4" asChild>
                      <Link to={selectedNode.href || SOP_BASE_PATH}>
                        Open page
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </article>

          <aside className="hidden xl:block xl:sticky xl:top-4 xl:h-fit">
            <HelpCenterDetailRail
              node={selectedNode}
              browseHref={SOP_BASE_PATH}
              browseLabel="Browse all SOPs"
              browseDescription="Search SOPs from the left rail or head back to the overview for related procedures."
            />
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminSopsPage;
