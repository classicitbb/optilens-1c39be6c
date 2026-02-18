import { useState, useMemo, useEffect } from "react";
import { wikiCategories } from "@/data/wikiContent";
import WikiSidebar from "@/components/admin/WikiSidebar";
import WikiContentPanel from "@/components/admin/WikiContentPanel";

const AdminWikiPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
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

  // If active article is filtered out, select the first visible one
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
      <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(215 25% 20%)" }}>
        <h1 className="text-sm font-semibold" style={{ color: "hsl(0 0% 100%)" }}>
          Help / Wiki
        </h1>
      </div>
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
    </div>
  );
};

export default AdminWikiPage;
