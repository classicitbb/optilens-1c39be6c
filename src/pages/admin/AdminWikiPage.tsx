import { useState, useMemo, useEffect } from "react";
import { wikiCategories } from "@/data/wikiContent";
import type { WikiCategory } from "@/data/wikiContent";
import WikiSidebar from "@/components/admin/WikiSidebar";
import WikiContentPanel from "@/components/admin/WikiContentPanel";
import WikiAssignmentsPanel from "@/components/admin/WikiAssignmentsPanel";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, List } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import { useWikiHeadings } from "@/hooks/useWikiHeadings";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { canViewContextSlug, canViewWikiCategory } from "@/lib/wikiPermissions";

const AdminWikiPage = () => {
  const { canEdit } = useAdminRole();
  const { canView } = useRolePermissions();
  const { toast } = useToast();
  const { articles: dbArticles } = useHelpArticles("knowledge/wiki");
  const { articles: allDbArticles, isLoading: allArticlesLoading } = useHelpArticles();
  const { headings: dbHeadings, createHeading, refetch: refetchHeadings } = useWikiHeadings();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(wikiCategories[0]?.articles[0]?.id ?? null);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const editableCategories = useMemo<WikiCategory[]>(() => {
    return dbHeadings.map((heading) => ({
      id: heading.slug,
      title: heading.title,
      icon: BookOpen,
      articles: dbArticles
        .filter((article) => {
          const contexts = article.context_slugs?.length ? article.context_slugs : [article.page_slug];
          return (article.category || "") === heading.slug && contexts.some((contextSlug) => canViewContextSlug(contextSlug, canView));
        })
        .map((article) => ({
          id: article.id,
          title: article.title,
          content: article.content,
          body_json: article.body_json,
          status: article.status,
          version_number: article.version_number,
          context_slugs: article.context_slugs,
        } as any)),
    }));
  }, [dbArticles, dbHeadings, canView]);

  const allHeadings = useMemo(() => {
    const base = wikiCategories.map((c) => ({ id: c.id, title: c.title }));
    const extra = dbHeadings
      .map((heading) => ({ id: heading.slug, title: heading.title }))
      .filter((h) => !base.some((b) => b.id === h.id));
    return [...base, ...extra];
  }, [dbHeadings]);

  const mergedCategories = useMemo(
    () => [...wikiCategories.filter((category) => canViewWikiCategory(category.id, canView)), ...editableCategories],
    [editableCategories, canView]
  );

  const lower = searchTerm.toLowerCase();

  const filtered = useMemo(
    () =>
      mergedCategories
        .map((cat) => ({
          ...cat,
          articles: cat.articles.filter(
            (a) => !searchTerm || a.title.toLowerCase().includes(lower) || a.content.toLowerCase().includes(lower)
          ),
        }))
        .filter((cat) => cat.articles.length > 0),
    [searchTerm, lower, mergedCategories]
  );

  useEffect(() => {
    const stillVisible = filtered.some((c) => c.articles.some((a) => a.id === activeArticleId));
    if (!stillVisible && filtered.length > 0 && filtered[0].articles.length > 0) {
      setActiveArticleId(filtered[0].articles[0].id);
    }
  }, [filtered, activeArticleId]);

  const handleSelectArticle = (_categoryId: string, articleId: string) => {
    setActiveArticleId(articleId);
  };

  const handleEditArticle = (article: { id: string; title: string; content: string }) => {
    setEditingArticleId(article.id);
  };

  const handleNewArticle = () => {
    setEditingArticleId("new");
    setActiveArticleId("new");
  };

  const handleAddHeading = async (title: string) => {
    try {
      await createHeading(title);
      toast({ title: "Heading added" });
    } catch (error: any) {
      toast({ title: "Error adding heading", description: error?.message ?? String(error), variant: "destructive" });
    }
  };

  return (
    <Tabs defaultValue="wiki" className="flex flex-col h-full [&>[data-state=inactive]]:hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AdminPageHeader icon={BookOpen} title="Help / Wiki" />
          <TabsList className="h-7">
            <TabsTrigger value="wiki" className="text-xs h-6 px-2.5 gap-1">
              <BookOpen className="h-3 w-3" /> Articles
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs h-6 px-2.5 gap-1">
              <List className="h-3 w-3" /> Help Assignments
            </TabsTrigger>
          </TabsList>
        </div>
        {canEdit && (
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleNewArticle}>
            <Plus className="h-3 w-3" /> New Article
          </Button>
        )}
      </div>

      <TabsContent value="wiki" className="flex flex-1 min-h-0 mt-0">
        <WikiSidebar
          categories={filtered}
          activeArticleId={activeArticleId}
          onSelectArticle={handleSelectArticle}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          canEdit={canEdit}
          onAddHeading={handleAddHeading}
          onRefresh={refetchHeadings}
          isCategoryVisible={(categoryId) => canViewWikiCategory(categoryId, canView)}
        />
        <WikiContentPanel
          categories={filtered}
          activeArticleId={activeArticleId}
          editingArticleId={editingArticleId}
          canEdit={canEdit}
          onEditArticle={handleEditArticle}
          onEditingChange={setEditingArticleId}
          isCategoryVisible={(categoryId) => canViewWikiCategory(categoryId, canView)}
          wikiHeadings={allHeadings}
        />
      </TabsContent>

      <TabsContent value="assignments" className="flex flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
        <WikiAssignmentsPanel articles={allDbArticles} isLoading={allArticlesLoading} />
      </TabsContent>
    </Tabs>
  );
};

export default AdminWikiPage;
