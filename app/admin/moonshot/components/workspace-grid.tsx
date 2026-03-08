"use client";

import { format } from "date-fns";
import { ArrowUp, ExternalLink, GripVertical, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "../lib/store";
import { WorkspaceTileType } from "../lib/types";

type Scope = "dashboard" | "workspace";

const addableTiles: { label: string; value: WorkspaceTileType }[] = [
  { label: "Metrics", value: "metrics" },
  { label: "Rocks", value: "rocks" },
  { label: "To-Dos", value: "todos" },
  { label: "Issues", value: "issues" },
  { label: "Headlines", value: "headlines" },
  { label: "Core Values", value: "core-values" },
  { label: "Notes", value: "notes" },
  { label: "Quick Links", value: "quick-links" },
];

export function WorkspaceGrid({ scope }: { scope: Scope }) {
  const router = useRouter();
  const {
    metrics,
    rocks,
    todos,
    issues,
    coreValues,
    privateNotes,
    headlines,
    quickLinks,
    dashboardTiles,
    workspaceTiles,
    addTile,
    removeTile,
    moveTile,
    resizeTile,
    updateTodo,
    updatePrivateNotes,
  } = useMoonshotStore();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [expandedTileId, setExpandedTileId] = useState<string | null>(null);

  const tiles = scope === "dashboard" ? dashboardTiles : workspaceTiles;
  const expanded = useMemo(() => tiles.find((tile) => tile.id === expandedTileId) ?? null, [expandedTileId, tiles]);

  const tileContent = (type: WorkspaceTileType, full = false) => {
    switch (type) {
      case "metrics":
        return (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground"><th>Who</th><th>Metric</th><th>Goal</th><th>Latest</th></tr>
            </thead>
            <tbody>
              {metrics.slice(0, full ? metrics.length : 4).map((metric) => {
                const latest = metric.points[metric.points.length - 1]?.value ?? metric.actual;
                return <tr key={metric.id} className="border-t"><td>{users.find((u) => u.id === metric.ownerId)?.name ?? "Unknown"}</td><td>{metric.name}</td><td>{metric.target}</td><td className={latest >= metric.target ? "text-emerald-600" : "text-red-600"}>{latest}</td></tr>;
              })}
            </tbody>
          </table>
        );
      case "rocks":
        return (
          <div className="space-y-2">
            {rocks.slice(0, full ? rocks.length : 5).map((rock) => (
              <div key={rock.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{rock.title}</span>
                <Badge variant="outline" className={rock.status === "On Track" ? "text-emerald-600" : rock.status === "Completed" ? "text-blue-600" : "text-rose-600"}>{rock.status}</Badge>
              </div>
            ))}
          </div>
        );
      case "todos":
        return (
          <div className="space-y-2">
            {todos.slice(0, full ? todos.length : 6).map((todo) => (
              <div key={todo.id} className="flex items-center justify-between rounded border p-2 text-sm gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={todo.completed} onCheckedChange={(checked) => updateTodo(todo.id, { completed: Boolean(checked) })} />
                  <span>{todo.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(todo.dueDate), "MMM d")} · {users.find((u) => u.id === todo.ownerId)?.name ?? "Unknown"}</span>
              </div>
            ))}
          </div>
        );
      case "issues":
        return (
          <div className="space-y-2">
            {issues.slice(0, full ? issues.length : 6).map((issue) => (
              <div key={issue.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{issue.title}</span>
                <Badge className={issue.priority === "High" ? "bg-rose-100 text-rose-700" : issue.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}>{issue.priority}</Badge>
              </div>
            ))}
          </div>
        );
      case "core-values":
        return <ul className="list-disc pl-5 text-sm space-y-1">{coreValues.map((value) => <li key={value}>{value}</li>)}</ul>;
      case "notes":
        return <Textarea value={privateNotes} onChange={(e) => updatePrivateNotes(e.target.value)} className={full ? "min-h-64" : "min-h-32"} />;
      case "headlines":
        return <div className="space-y-2">{headlines.map((headline) => <div key={headline} className="rounded border p-2 text-sm">{headline}</div>)}</div>;
      case "quick-links":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <Button key={link.href} variant="outline" className="justify-between" onClick={() => router.push(link.href)}>
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </Button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const navigateForTile = (type: WorkspaceTileType) => {
    const routeMap: Record<WorkspaceTileType, string> = {
      metrics: "/admin/moonshot/scorecards",
      rocks: "/admin/moonshot/rocks",
      todos: "/admin/moonshot/todos",
      issues: "/admin/moonshot/issues",
      headlines: "/admin/moonshot/workspace",
      "core-values": "/admin/moonshot/business-plan",
      notes: "/admin/moonshot/workspace",
      "quick-links": "/admin/moonshot/workspace",
    };
    router.push(routeMap[type]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddTileDialog onAdd={(type) => addTile(scope, type)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiles.map((tile, idx) => (
          <Card
            key={tile.id}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex === null || dragIndex === idx) return;
              moveTile(scope, dragIndex, idx);
              setDragIndex(null);
            }}
            className={`rounded-xl border bg-white ${tile.colSpan >= 4 ? "xl:col-span-4" : tile.colSpan === 3 ? "xl:col-span-3" : tile.colSpan === 2 ? "xl:col-span-2" : "xl:col-span-1"}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm text-teal-700 flex items-center gap-2"><GripVertical className="h-4 w-4" />{tile.title}</CardTitle>
                <div className="flex items-center gap-1">
                  <AddTileDialog onAdd={(type) => addTile(scope, type)} compact />
                  <Select value={String(tile.colSpan)} onValueChange={(v) => resizeTile(scope, tile.id, Number(v) as 1 | 2 | 3 | 4)}>
                    <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem><SelectItem value="2">2x</SelectItem><SelectItem value="3">3x</SelectItem><SelectItem value="4">4x</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveTile(scope, idx, Math.max(0, idx - 1))}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeTile(scope, tile.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tileContent(tile.type)}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setExpandedTileId(tile.id)}>Open</Button>
                <Button size="sm" onClick={() => navigateForTile(tile.type)}>Go to full page</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(expanded)} onOpenChange={(open) => !open && setExpandedTileId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{expanded?.title}</DialogTitle></DialogHeader>
          {expanded ? tileContent(expanded.type, true) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddTileDialog({ onAdd, compact = false }: { onAdd: (type: WorkspaceTileType) => void; compact?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={compact ? "icon" : "sm"} variant={compact ? "ghost" : "default"} className={compact ? "h-8 w-8" : ""}>
          <Plus className="h-4 w-4" />
          {!compact ? "+ Add tile" : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add tile</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {addableTiles.map((tile) => (
            <Button key={tile.value} variant="outline" onClick={() => onAdd(tile.value)}>{tile.label}</Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
