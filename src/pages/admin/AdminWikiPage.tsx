import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { BookOpen, CalendarClock, ListTree, Search } from "lucide-react";
import { wikiCategories } from "@/data/wikiContent";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import { canViewContextSlug, canViewWikiCategory } from "@/lib/wikiPermissions";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WikiAssignmentsPanel from "@/components/admin/WikiAssignmentsPanel";
import { toAdminWikiArticlePath, toWikiArticleSlug } from "@/lib/wikiArticleRouting";

interface WikiArticleView {
  id: string;
  title: string;
  content: string;
  body_json?: unknown;
  categoryId: string;
  categoryTitle: string;
  status?: "draft" | "published" | "archived";
  updated_at?: string;
  slug?: string | null;
}

const formatUpdatedAt = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Static reference article";

const AdminWikiPage = () => {
  const { articleSlug } = useParams<{ articleSlug?: string }>();
  const navigate = useNavigate();
  const { canView } = useRolePermissions();
  const { articles: dbArticles } = useHelpArticles("knowledge/wiki");
  const { articles: allDbArticles, isLoading: allArticlesLoading } = useHelpArticles();

  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const categories = useMemo(() => {
    const staticCategories = wikiCategories
      .filter((category) => canViewWikiCategory(category.id, canView))
      .map((category) => ({
        id: category.id,
        title: category.title,
        articles: category.articles
          .filter((article) => {
            const contexts = article.context_slugs?.length ? article.context_slugs : ["knowledge/wiki"];
            return contexts.some((contextSlug) => canViewContextSlug(contextSlug, canView));
          })
          .map((article): WikiArticleView => ({
            id: `static:${article.id}`,
            title: article.title,
            content: article.content,
            body_json: (article as any).body_json,
            categoryId: category.id,
            categoryTitle: category.title,
            status: "published" as const,
            slug: null,
          })),
      }));

    const dbByCategory = new Map<string, WikiArticleView[]>();
    dbArticles.forEach((article) => {
      const categoryId = article.category || "general";
      const next = dbByCategory.get(categoryId) ?? [];
      next.push({
        id: article.id,
        title: article.title,
        content: article.content,
        body_json: article.body_json,
        categoryId,
        categoryTitle: categoryId.replace(/[-_]/g, " "),
        status: article.status,
        updated_at: article.updated_at,
        slug: article.slug,
      });
      dbByCategory.set(categoryId, next);
    });

    dbByCategory.forEach((articles, categoryId) => {
      const existing = staticCategories.find((category) => category.id === categoryId);
      if (existing) {
        existing.articles = [...existing.articles, ...articles];
        return;
      }
      staticCategories.push({
        id: categoryId,
        title: categoryId.replace(/[-_]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
        articles,
      });
    });

    return staticCategories;
  }, [canView, dbArticles]);

  const filteredCategories = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          articles: category.articles.filter((article) => {
            if (!normalizedSearch) return true;
            return article.title.toLowerCase().includes(normalizedSearch) || article.content.toLowerCase().includes(normalizedSearch);
          }),
        }))
        .filter((category) => category.articles.length > 0),
    [categories, normalizedSearch]
  );

  const articleLookup = useMemo(() => {
    const items = filteredCategories.flatMap((category) =>
      category.articles.map((article) => ({
        ...article,
        routeSlug: toWikiArticleSlug({ id: article.id, title: article.title, slug: article.slug }),
      }))
    );
    return items;
  }, [filteredCategories]);

  const activeArticle = useMemo(
    () => articleLookup.find((article) => article.routeSlug === articleSlug),
    [articleLookup, articleSlug]
  );

  useEffect(() => {
    if (!articleSlug) return;
    if (!activeArticle) {
      navigate("/admin/knowledge/wiki", { replace: true });
    }
  }, [activeArticle, articleSlug, navigate]);

  return (
    <Tabs defaultValue="docs" className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight">Knowledge Wiki</h1>
          <TabsList className="h-7">
            <TabsTrigger value="docs" className="text-xs h-6">Documentation</TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs h-6">Help Assignments</TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="docs" className="mt-0 flex-1 min-h-0">
        <div className="grid grid-cols-[280px_1fr] h-full min-h-0">
          <aside className="border-r border-border bg-muted/20 min-h-0">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-8 text-xs pl-7"
                  placeholder="Search docs..."
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-57px)]">
              <div className="py-2 px-2 space-y-3">
                {filteredCategories.map((category) => (
                  <div key={category.id} className="space-y-1">
                    <div className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <ListTree className="h-3 w-3" /> {category.title}
                    </div>
                    {category.articles.map((article) => {
                      const path = toAdminWikiArticlePath({ id: article.id, title: article.title, slug: article.slug });
                      const isActive = activeArticle?.id === article.id;
                      return (
                        <Button
                          key={article.id}
                          variant="ghost"
                          className={`h-auto w-full justify-start px-2 py-1.5 text-left text-xs ${isActive ? "bg-primary/10 text-primary" : ""}`}
                          onClick={() => navigate(path)}
                        >
                          <span className="truncate">{article.title}</span>
                        </Button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>

          <main className="min-h-0">
            <ScrollArea className="h-full">
              {!activeArticle ? (
                <div className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Documentation Topics</h2>
                  <p className="text-sm text-muted-foreground">
                    Browse by module, search for a topic, and open a dedicated article URL for sharing.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {filteredCategories.map((category) => (
                      <div key={category.id} className="border border-border rounded-lg p-4 bg-card">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{category.title}</h3>
                          <Badge variant="secondary">{category.articles.length}</Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          {category.articles.slice(0, 4).map((article) => (
                            <button
                              key={article.id}
                              type="button"
                              className="text-xs text-primary hover:underline block text-left"
                              onClick={() => navigate(toAdminWikiArticlePath({ id: article.id, title: article.title, slug: article.slug }))}
                            >
                              {article.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <article className="max-w-4xl mx-auto p-6 space-y-4">
                  <header className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{activeArticle.categoryTitle}</Badge>
                      {activeArticle.status && <Badge variant="secondary">{activeArticle.status}</Badge>}
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{activeArticle.title}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Last updated: {formatUpdatedAt(activeArticle.updated_at)}
                    </p>
                  </header>
                  <WikiArticleRenderer
                    bodyJson={activeArticle.body_json as never}
                    legacyContent={activeArticle.content}
                    className="text-sm"
                    emptyMessage="This article has no content yet."
                  />
                </article>
              )}
            </ScrollArea>
          </main>
        </div>
      </TabsContent>

      <TabsContent value="assignments" className="mt-0 flex-1 min-h-0">
        <WikiAssignmentsPanel articles={allDbArticles} isLoading={allArticlesLoading} />
      </TabsContent>
    </Tabs>
  );
};

export default AdminWikiPage;
