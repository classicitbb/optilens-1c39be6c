import { useState, useMemo, useEffect } from "react";
import { wikiCategories } from "@/data/wikiContent";
import type { WikiCategory } from "@/data/wikiContent";
import WikiSidebar from "@/components/admin/WikiSidebar";
import WikiContentPanel from "@/components/admin/WikiContentPanel";
import WikiArticleEditDialog from "@/components/admin/WikiArticleEditDialog";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import { useWikiHeadings } from "@/hooks/useWikiHeadings";
import { useToast } from "@/hooks/use-toast";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string) => !!value && UUID_RE.test(value);

const AdminWikiPage = () => {
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const { articles: dbArticles } = useHelpArticles("knowledge/wiki");
  const { headings: dbHeadings, createHeading } = useWikiHeadings();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(
    wikiCategories[0]?.articles[0]?.id ?? null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);

  const editableCategories = useMemo<WikiCategory[]>(() => {
    return dbHeadings.map((heading) => ({
      id: heading.slug,
      title: heading.title,
      icon: BookOpen,
      articles: dbArticles
        .filter((article) => (article.category || "") === heading.slug)
        .map((article) => ({ id: article.id, title: article.title, content: article.content })),
    }));
  }, [dbArticles, dbHeadings]);

  const allHeadings = useMemo(() => {
    const base = wikiCategories.map((c) => ({ id: c.id, title: c.title }));
    const extra = dbHeadings
      .map((heading) => ({ id: heading.slug, title: heading.title }))
      .filter((h) => !base.some((b) => b.id === h.id));
    return [...base, ...extra];
  }, [dbHeadings]);

  const mergedCategories = useMemo(() => [...wikiCategories, ...editableCategories], [editableCategories]);

  const lower = searchTerm.toLowerCase();

  const filtered = useMemo(
    () =>
      mergedCategories
        .map((cat) => ({
          ...cat,
          articles: cat.articles.filter(
            (a) =>
              !searchTerm ||
              a.title.toLowerCase().includes(lower) ||
              a.content.toLowerCase().includes(lower)
          ),
        }))
        .filter((cat) => cat.articles.length > 0),
    [searchTerm, lower, mergedCategories]
  );

  useEffect(() => {
    const stillVisible = filtered.some((c) =>
      c.articles.some((a) => a.id === activeArticleId)
    );
    if (
      !stillVisible &&
      filtered.length > 0 &&
      filtered[0].articles.length > 0
    ) {
      setActiveArticleId(filtered[0].articles[0].id);
    }
  }, [filtered, activeArticleId]);

  const handleSelectArticle = (_categoryId: string, articleId: string) => {
    setActiveArticleId(articleId);
  };

  const handleEditArticle = (article: { id: string; title: string; content: string }, categoryId?: string) => {
    setEditingArticle({
      id: isUuid(article.id) ? article.id : undefined,
      title: article.title,
      content: article.content,
      category: categoryId ?? "",
      context_slugs: ["knowledge/wiki"],
    });
    setEditDialogOpen(true);
  };

  const handleNewArticle = () => {
    setEditingArticle(null);
    setEditDialogOpen(true);
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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <AdminPageHeader icon={BookOpen} title="Help / Wiki" />
        {canEdit && (
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleNewArticle}>
            <Plus className="h-3 w-3" /> New Article
          </Button>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <WikiSidebar
          categories={filtered}
          activeArticleId={activeArticleId}
          onSelectArticle={handleSelectArticle}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          canEdit={canEdit}
          onAddHeading={handleAddHeading}
        />
        <WikiContentPanel
          categories={mergedCategories}
          activeArticleId={activeArticleId}
          canEdit={canEdit}
          onEditArticle={handleEditArticle}
        />
      </div>

      <WikiArticleEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        article={editingArticle}
        wikiHeadings={allHeadings}
      />
    </div>
  );
};

export default AdminWikiPage;
