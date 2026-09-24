import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { extractCanonicalHeadings, type HelpCenterNode } from "@/lib/helpCenter";
import { cn } from "@/lib/utils";
import { ChevronRight, Search } from "lucide-react";
import { useMemo } from "react";
import { Link, NavLink } from "react-router";

export const nodeMatchesQuery = (node: HelpCenterNode, query: string) => {
  if (!query) return true;
  const haystack = [
    node.title,
    node.summary,
    node.slug,
    ...(node.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
};

export const HelpCenterSidebar = ({
  sections,
  searchTerm,
  onSearchChange,
  activeSlug,
  getNodeHref,
  label = "Help Navigation",
  searchPlaceholder = "Search help",
}: {
  sections: HelpCenterNode[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeSlug?: string;
  getNodeHref: (node: HelpCenterNode) => string;
  label?: string;
  searchPlaceholder?: string;
}) => (
  <div className="flex h-full flex-col rounded-[1.75rem] border border-border/60 bg-card/85">
    <div className="border-b border-border/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 rounded-xl border-border/70 pl-9"
        />
      </div>
    </div>
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-5 p-4">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span>{section.title}</span>
              <span className="text-[10px]">{section.children.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {section.children.map((node) => (
                <NavLink
                  key={node.id}
                  to={getNodeHref(node)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-xl px-3 py-2 text-sm transition-colors",
                      (isActive || activeSlug === node.slug) && node.kind === "article"
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-pretty font-medium leading-5">{node.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{node.summary}</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
);

export const HelpCenterDetailRail = ({
  node,
  browseHref = "/knowledge",
  browseLabel = "Browse all help topics",
  browseDescription = "Search the help center from the left rail or head back to the collections overview for related topics.",
}: {
  node: HelpCenterNode | null;
  browseHref?: string;
  browseLabel?: string;
  browseDescription?: string;
}) => {
  const toc = useMemo(
    () => (node?.kind === "article" ? extractCanonicalHeadings(node.bodyJson) : []),
    [node],
  );

  if (!node) return null;

  return (
    <div className="space-y-5">
      <Card className="border-border/60 bg-card/90">
        <CardContent className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Table of Contents
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {toc.length > 0 ? (
              toc.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={cn(
                    "text-sm text-muted-foreground transition-colors hover:text-foreground",
                    heading.level > 2 && "pl-4",
                  )}
                >
                  {heading.text}
                </a>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                This entry is short-form, so there are no in-page headings to jump between.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {node.kind === "article" ? (
        <Card className="border-border/60 bg-card/90">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Need something more specific?</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{browseDescription}</p>
            <Button variant="outline" className="mt-4 w-full" asChild>
              <Link to={browseHref}>{browseLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
