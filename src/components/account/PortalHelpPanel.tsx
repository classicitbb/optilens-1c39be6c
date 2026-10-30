import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import { isHowTo } from "@/help/helpArticleKinds";
import { PORTAL_CONTEXT_OPTIONS } from "@/help/portalContexts";
import { usePortalHelpArticles, type PortalHelpArticle } from "@/help/usePortalHelpArticles";

interface PortalHelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextSlug: string;
}

const ArticleItem = ({ article }: { article: PortalHelpArticle }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="rounded-md border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/60"
      >
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        <span className="min-w-0 flex-1">{article.title}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <WikiArticleRenderer
            bodyJson={article.body_json}
            legacyContent={article.content}
            className="prose prose-sm max-w-none break-words text-muted-foreground [&_p]:my-1 [&_li]:my-0.5"
          />
        </div>
      )}
    </li>
  );
};

/** Page help for the customer portal: customer-visible articles and how-tos for the page being viewed. */
const PortalHelpPanel = ({ open, onOpenChange, contextSlug }: PortalHelpPanelProps) => {
  const { data: articles = [], isLoading, isError } = usePortalHelpArticles(contextSlug, open);
  const pageLabel = PORTAL_CONTEXT_OPTIONS.find((option) => option.value === contextSlug)?.label;
  const howTos = articles.filter((a) => isHowTo(a));
  const others = articles.filter((a) => !isHowTo(a));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Help{pageLabel ? `: ${pageLabel}` : ""}</SheetTitle>
          <SheetDescription>Guides for this page. For anything else, use Help in the top bar to reach our team.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {isError && <p className="text-sm text-muted-foreground">Guides could not be loaded right now. Please try again later.</p>}
          {!isLoading && !isError && articles.length === 0 && (
            <p className="text-sm text-muted-foreground">There is no guide for this page yet.</p>
          )}
          {howTos.length > 0 && (
            <section aria-label="How to…" className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to…</h3>
              <ul className="space-y-2">{howTos.map((a) => <ArticleItem key={a.id} article={a} />)}</ul>
            </section>
          )}
          {others.length > 0 && (
            <section aria-label="About this page" className="space-y-2">
              {howTos.length > 0 && <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">About this page</h3>}
              <ul className="space-y-2">{others.map((a) => <ArticleItem key={a.id} article={a} />)}</ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PortalHelpPanel;
