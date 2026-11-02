import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { employeeDisplayName, type Employee } from "./useEmployees";
import { STATUS_LABELS } from "./formFields";
import { branchIds, buildOrgTree, countDescendants, type OrgNode } from "./orgTree";

interface OrgChartProps {
  employees: Employee[];
  /** Employees matching the page search; the rest are dimmed. Omit for no highlighting. */
  highlightIds?: Set<string>;
  onOpen: (employee: Employee) => void;
}

interface NodeProps {
  node: OrgNode;
  collapsed: Set<string>;
  highlightIds?: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (employee: Employee) => void;
}

const Line = ({ className }: { className: string }) => <span aria-hidden className={cn("absolute bg-border", className)} />;

const OrgNodeView = ({ node, collapsed, highlightIds, onToggle, onOpen }: NodeProps) => {
  const { employee: e, reports } = node;
  const isCollapsed = collapsed.has(e.id);
  const dimmed = highlightIds && !highlightIds.has(e.id);
  const total = countDescendants(node);

  return (
    <li className="relative flex flex-col items-center">
      <div className={cn("w-52 rounded-md border bg-card p-2.5 text-center shadow-sm transition-opacity", dimmed && "opacity-40")}>
        <button type="button" onClick={() => onOpen(e)} className="block w-full truncate text-sm font-medium hover:underline" title={employeeDisplayName(e)}>
          {employeeDisplayName(e)}
        </button>
        <div className="truncate text-xs text-muted-foreground">{e.job_title ?? "No job title"}</div>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
          {e.department && <Badge variant="outline" className="max-w-full truncate text-[10px]">{e.department}</Badge>}
          {e.status !== "active" && <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[e.status]}</Badge>}
        </div>
        {reports.length > 0 && (
          <button
            type="button"
            onClick={() => onToggle(e.id)}
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? "Show" : "Hide"} ${reports.length} direct report${reports.length === 1 ? "" : "s"} of ${employeeDisplayName(e)}`}
            className="mt-1.5 inline-flex items-center gap-0.5 rounded px-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {reports.length} direct{total > reports.length ? ` · ${total} total` : ""}
          </button>
        )}
      </div>

      {reports.length > 0 && !isCollapsed && (
        <>
          <span aria-hidden className="h-4 w-px bg-border" />
          <ul className="flex items-start">
            {reports.map((child, i) => (
              <li key={child.employee.id} className="relative flex flex-col items-center px-2 pt-4">
                {reports.length > 1 && <Line className={cn("top-0 h-px", i === 0 ? "left-1/2 right-0" : i === reports.length - 1 ? "left-0 right-1/2" : "left-0 right-0")} />}
                <Line className="left-1/2 top-0 h-4 w-px" />
                <OrgNodeView node={child} collapsed={collapsed} highlightIds={highlightIds} onToggle={onToggle} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  );
};

const OrgChart = ({ employees, highlightIds, onOpen }: OrgChartProps) => {
  const tree = useMemo(() => buildOrgTree(employees), [employees]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  if (tree.length === 0) return <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">No employees match.</div>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setCollapsed(new Set())}>Expand all</Button>
        <Button size="sm" variant="outline" onClick={() => setCollapsed(new Set(branchIds(tree)))}>Collapse all</Button>
      </div>
      <div className="overflow-auto rounded-md border p-4" data-tour="hr-people-orgchart">
        <ul className="mx-auto flex w-max items-start gap-4">
          {tree.map((node) => (
            <OrgNodeView key={node.employee.id} node={node} collapsed={collapsed} highlightIds={highlightIds} onToggle={toggle} onOpen={onOpen} />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OrgChart;
