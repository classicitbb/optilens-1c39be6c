import { useState, useMemo, useEffect } from "react";
import { wikiCategories } from "@/data/wikiContent";
import WikiSidebar from "@/components/admin/WikiSidebar";
import WikiContentPanel from "@/components/admin/WikiContentPanel";
import WikiArticleEditDialog from "@/components/admin/WikiArticleEditDialog";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const AdminWikiPage = () => {
  const { canEdit } = useAdminRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(
    wikiCategories[0]?.articles[0]?.id ?? null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [customHeadings, setCustomHeadings] = useState<{ id: string; title: string }[]>([]);

  const allHeadings = useMemo(() => {
    const base = wikiCategories.map((c) => ({ id: c.id, title: c.title }));
    const extra = customHeadings.filter((h) => !base.some((b) => b.id === h.id));
    return [...base, ...extra];
  }, [customHeadings]);

  const lower = searchTerm.toLowerCase();

  const filtered = useMemo(
    () =>
      wikiCategories
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
    [searchTerm, lower]
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
      id: article.id,
      title: article.title,
      content: article.content,
      category: categoryId ?? "",
      page_slug: "wiki",
    });
    setEditDialogOpen(true);
  };

  const handleNewArticle = () => {
    setEditingArticle(null);
    setEditDialogOpen(true);
  };

  const handleAddHeading = (title: string) => {
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!allHeadings.some((h) => h.id === id)) {
      setCustomHeadings((prev) => [...prev, { id, title }]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground">Help / Wiki</h1>
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
          categories={wikiCategories}
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
