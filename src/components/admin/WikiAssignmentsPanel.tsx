import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText } from "lucide-react";
import { getContextLabel } from "@/lib/adminContexts";
import type { HelpArticle } from "@/hooks/useHelpArticles";

interface WikiAssignmentsPanelProps {
  articles: HelpArticle[];
  isLoading: boolean;
}

const WikiAssignmentsPanel = ({ articles, isLoading }: WikiAssignmentsPanelProps) => {
  const [search, setSearch] = useState("");
  const lower = search.toLowerCase();

  const rows = useMemo(() => {
    return articles
      .filter(
        (a) =>
          !search ||
          a.title.toLowerCase().includes(lower) ||
          a.context_slugs.some((s) => s.toLowerCase().includes(lower) || getContextLabel(s).toLowerCase().includes(lower))
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [articles, search, lower]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading articles…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-border">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by title or page…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground w-[40%]">Article Title</th>
                <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground w-[20%]">Category</th>
                <th className="pb-2 text-xs font-medium text-muted-foreground">Assigned Pages (flyout)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground text-xs">
                    No articles found.
                  </td>
                </tr>
              ) : (
                rows.map((article) => (
                  <tr key={article.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate">{article.title}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs text-muted-foreground">{article.category || "—"}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {article.context_slugs.map((slug) => (
                          <Badge key={slug} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                            {getContextLabel(slug)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground mt-3">
            {rows.length} article{rows.length !== 1 ? "s" : ""} · Showing pages where each article appears in the help flyout sidebar.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
};

export default WikiAssignmentsPanel;
