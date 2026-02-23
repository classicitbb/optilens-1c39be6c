import { useState, useMemo, useEffect } from "react";
import { wikiCategories } from "@/data/wikiContent";
import WikiSidebar from "@/components/admin/WikiSidebar";
import WikiContentPanel from "@/components/admin/WikiContentPanel";
import HelpArticleEditor from "@/components/admin/HelpArticleEditor";
import { useAdminRole } from "@/contexts/AdminRoleContext";

const AdminWikiPage = () => {
  const { canEdit } = useAdminRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "manage">("browse");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(
    wikiCategories[0]?.articles[0]?.id ?? null
  );

  const lower = searchTerm.toLowerCase();

  const filtered = useMemo(() =>
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
    const stillVisible = filtered.some(c => c.articles.some(a => a.id === activeArticleId));
    if (!stillVisible && filtered.length > 0 && filtered[0].articles.length > 0) {
      setActiveArticleId(filtered[0].articles[0].id);
    }
  }, [filtered, activeArticleId]);

  const handleSelectArticle = (_categoryId: string, articleId: string) => {
    setActiveArticleId(articleId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground">Help / Wiki</h1>
        {canEdit && (
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setActiveTab("browse")}
              className={`text-[11px] px-2 py-0.5 rounded ${activeTab === "browse" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Browse
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`text-[11px] px-2 py-0.5 rounded ${activeTab === "manage" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Manage Articles
            </button>
          </div>
        )}
      </div>

      {activeTab === "browse" ? (
        <div className="flex flex-1 min-h-0">
          <WikiSidebar
            categories={filtered}
            activeArticleId={activeArticleId}
            onSelectArticle={handleSelectArticle}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <WikiContentPanel
            categories={wikiCategories}
            activeArticleId={activeArticleId}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-background overflow-auto">
          <HelpArticleEditor />
        </div>
      )}
    </div>
  );
};

export default AdminWikiPage;
