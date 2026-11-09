import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { branchIds, countDescendants, type TreeNode } from "./orgTree";

interface OrgTreeViewProps<T> {
  nodes: TreeNode<T>[];
  idOf: (item: T) => string;
  labelOf: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  emptyText: string;
  /** Marks the chart for the guided tour. */
  tourId?: string;
}

const Line = ({ className }: { className: string }) => <span aria-hidden className={cn("absolute bg-border", className)} />;

/** Shared tree layout: cards joined by connector lines, with collapsible branches. */
const OrgTreeView = <T,>({ nodes, idOf, labelOf, renderCard, emptyText, tourId }: OrgTreeViewProps<T>) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const renderNode = (node: TreeNode<T>) => {
    const id = idOf(node.item);
    const isCollapsed = collapsed.has(id);
    const total = countDescendants(node);
    const count = node.reports.length;

    return (
      <div className="relative flex flex-col items-center">
        {renderCard(node.item)}
        {count > 0 && (
          <button
            type="button"
            onClick={() => toggle(id)}
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? "Show" : "Hide"} ${count} direct report${count === 1 ? "" : "s"} of ${labelOf(node.item)}`}
            className="mt-1 inline-flex items-center gap-0.5 rounded px-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {count} direct{total > count ? ` · ${total} total` : ""}
          </button>
        )}
        {count > 0 && !isCollapsed && (
          <>
            <span aria-hidden className="h-3 w-px bg-border" />
            <ul className="flex items-start">
              {node.reports.map((child, i) => (
                <li key={idOf(child.item)} className="relative flex flex-col items-center px-2 pt-4">
                  {count > 1 && <Line className={cn("top-0 h-px", i === 0 ? "left-1/2 right-0" : i === count - 1 ? "left-0 right-1/2" : "left-0 right-0")} />}
                  <Line className="left-1/2 top-0 h-4 w-px" />
                  {renderNode(child)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  if (nodes.length === 0) return <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">{emptyText}</div>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setCollapsed(new Set())}>Expand all</Button>
        <Button size="sm" variant="outline" onClick={() => setCollapsed(new Set(branchIds(nodes, idOf)))}>Collapse all</Button>
      </div>
      <div className="overflow-auto rounded-md border p-4" data-tour={tourId}>
        <ul className="mx-auto flex w-max items-start gap-4">
          {nodes.map((node) => <li key={idOf(node.item)}>{renderNode(node)}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default OrgTreeView;
