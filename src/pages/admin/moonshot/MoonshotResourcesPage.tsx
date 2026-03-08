import { useMemo, useState } from "react";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, BookOpen } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { renderWikiContent } from "@/components/admin/wikiFormatting";
import HelpFeedbackButtons from "@/components/admin/HelpFeedbackButtons";

const MOONSHOT_SLUGS = [
  "moonshot",
  "moonshot/dashboard",
  "moonshot/workspace",
  "moonshot/meetings",
  "moonshot/scorecards",
  "moonshot/rocks",
  "moonshot/todos",
  "moonshot/issues",
  "moonshot/business-plan",
  "moonshot/tools",
  "moonshot/users",
  "moonshot/resources",
];

const isMoonshotArticle = (contextSlugs: string[]) =>
  contextSlugs.some((s) => MOONSHOT_SLUGS.includes(s) || s.startsWith("moonshot"));

export default function MoonshotResourcesPage() {
  const { articles, isLoading } = useHelpArticles();
  const [search, setSearch] = useState("");
  const lower = search.toLowerCase();

  const filtered = useMemo(() => {
    return articles
      .filter((a) => isMoonshotArticle(a.context_slugs))
      .filter(
        (a) =>
          !search ||
          a.title.toLowerCase().includes(lower) ||
          a.content.toLowerCase().includes(lower)
      )
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  }, [articles, search, lower]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Resources</h1>
        <div className="relative max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p className="text-sm">No articles assigned to Moonshot yet.</p>
          <p className="text-xs">Assign articles via Help / Wiki → Help Assignments.</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <Accordion type="single" collapsible className="space-y-2">
              {filtered.map((article) => (
                <AccordionItem
                  key={article.id}
                  value={article.id}
                  className="rounded-lg border border-border bg-card px-4 [&[data-state=open]]:bg-muted/20"
                >
                  <AccordionTrigger className="hover:no-underline gap-3 py-3">
                    <div className="flex items-center gap-2 text-left min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{article.title}</span>
                      {article.context_slugs
                        .filter((s) => s.startsWith("moonshot"))
                        .map((slug) => (
                          <Badge key={slug} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                            {slug.replace("moonshot/", "").replace("moonshot", "all")}
                          </Badge>
                        ))}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none text-sm text-muted-foreground leading-relaxed pb-2">
                      {renderWikiContent(article.content)}
                    </div>
                    <div className="border-t border-border pt-3 mt-3">
                      <HelpFeedbackButtons articleId={article.id} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="text-[11px] text-muted-foreground pt-3">
              {filtered.length} article{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
