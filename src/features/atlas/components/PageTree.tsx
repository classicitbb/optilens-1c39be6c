import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ChevronRight, Copy, FileText, FolderInput, Link2, MoreHorizontal, Pencil, Plus, Star, StarOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TreeNode } from "../pageTree";
import type { AtlasPageMeta } from "../hooks/useAtlasPrefs";
import type { DropPosition } from "./pageTreeLogic";

export interface PageTreeProps {
  nodes: TreeNode[];
  activeId: string | null;
  /** Ids whose open state differs from the default (sections open, pages closed). */
  toggled: Set<string>;
  onToggle: (id: string) => void;
  pageMeta: Record<string, AtlasPageMeta>;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onOpen: (node: TreeNode) => void;
  onAddChild: (node: TreeNode) => void;
  onRename: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onMoveTo: (id: string) => void;
  onArchive: (id: string) => void;
  /** Sections can be renamed (through onRename) and deleted. */
  onDeleteSection: (id: string) => void;
  onMove: (dragId: string, targetId: string, position: DropPosition) => void;
  canEdit: boolean;
}

const bySort = (a: TreeNode, b: TreeNode) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);

const containsId = (node: TreeNode, id: string): boolean =>
  node.children.some((child) => child.id === id || containsId(child, id));

const dropPositionFor = (event: DragEvent<HTMLElement>, isSection: boolean): DropPosition => {
  if (isSection) return "inside";
  const rect = event.currentTarget.getBoundingClientRect();
  const offset = (event.clientY - rect.top) / rect.height;
  if (offset < 0.25) return "before";
  if (offset > 0.75) return "after";
  return "inside";
};

const PageTree = (props: PageTreeProps) => {
  const { nodes, activeId } = props;
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; position: DropPosition } | null>(null);
  const sorted = useMemo(() => [...nodes].sort(bySort), [nodes]);

  return (
    <div role="tree" aria-label="Pages" className="space-y-px px-2 pb-2">
      {sorted.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          {...props}
          activeId={activeId}
          dragId={dragId}
          setDragId={setDragId}
          drop={drop}
          setDrop={setDrop}
        />
      ))}
    </div>
  );
};

type RowProps = PageTreeProps & {
  node: TreeNode;
  depth: number;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  drop: { id: string; position: DropPosition } | null;
  setDrop: (drop: { id: string; position: DropPosition } | null) => void;
};

const TreeRow = (props: RowProps) => {
  const {
    node,
    depth,
    activeId,
    toggled,
    onToggle,
    pageMeta,
    favoriteIds,
    onToggleFavorite,
    onOpen,
    onAddChild,
    onRename,
    onDuplicate,
    onMoveTo,
    onArchive,
    onDeleteSection,
    onMove,
    canEdit,
    dragId,
    setDragId,
    drop,
    setDrop,
  } = props;

  const isSection = node.kind === "section";
  const isActive = activeId === node.id;
  const hasChildren = node.children.length > 0;
  const holdsActive = activeId ? containsId(node, activeId) : false;
  const open = isSection ? !toggled.has(node.id) || holdsActive : toggled.has(node.id) || holdsActive;
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const favorite = favoriteIds.includes(node.id);
  const icon = pageMeta[node.id]?.icon;
  const dropHere = drop?.id === node.id ? drop.position : null;

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const commitRename = () => {
    setRenaming(false);
    const next = title.trim();
    if (next && next !== node.title) onRename(node.id, next);
    else setTitle(node.title);
  };

  const draggable = canEdit && !isSection && !renaming;

  return (
    <div role="none">
      <div
        role="treeitem"
        aria-level={depth + 1}
        aria-selected={isActive}
        aria-expanded={hasChildren ? open : undefined}
        draggable={draggable}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", node.id);
          setDragId(node.id);
        }}
        onDragEnd={() => {
          setDragId(null);
          setDrop(null);
        }}
        onDragOver={(event) => {
          if (!canEdit || !dragId || dragId === node.id) return;
          const position = dropPositionFor(event, isSection);
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (drop?.id !== node.id || drop.position !== position) setDrop({ id: node.id, position });
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const dragged = dragId ?? event.dataTransfer.getData("text/plain");
          const position = dropPositionFor(event, isSection);
          setDrop(null);
          setDragId(null);
          if (dragged && dragged !== node.id) onMove(dragged, node.id, position);
        }}
        style={{ paddingLeft: 4 + depth * 14 }}
        className={cn(
          "group relative flex h-7 items-center gap-1 rounded-[4px] pr-1 text-[14px] text-ws-ink-2",
          "hover:bg-[var(--ws-hover)] active:bg-[var(--ws-press)]",
          isActive && "bg-ws-side-hover font-semibold text-ws-ink",
          dragId === node.id && "opacity-40",
          dropHere === "inside" && "bg-ws-accent-tint ring-1 ring-ws-accent",
        )}
      >
        {dropHere === "before" ? <span className="pointer-events-none absolute inset-x-1 -top-px h-0.5 bg-ws-accent" /> : null}
        {dropHere === "after" ? <span className="pointer-events-none absolute inset-x-1 -bottom-px h-0.5 bg-ws-accent" /> : null}

        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          tabIndex={-1}
          onClick={() => onToggle(node.id)}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-ws-ink-3 hover:bg-[var(--ws-press)]",
            !hasChildren && !isSection && "invisible",
          )}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        </button>

        {renaming ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") {
                setTitle(node.title);
                setRenaming(false);
              }
            }}
            className="h-6 min-w-0 flex-1 border border-ws-accent bg-ws-paper px-1 text-[14px] text-ws-ink outline-none"
            aria-label={isSection ? "Section name" : "Page title"}
          />
        ) : (
          <button
            type="button"
            onClick={() => (isSection ? onToggle(node.id) : onOpen(node))}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            {isSection ? null : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[15px] leading-none text-ws-ink-3">
                {icon ? icon : node.kind === "link" ? <Link2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              </span>
            )}
            <span className={cn("truncate", isSection && "ws-label text-ws-ink-3")}>{node.title}</span>
            {!isSection && node.status === "draft" ? (
              <span className="ws-label ml-auto shrink-0 text-[9px] text-ws-ink-3">Draft</span>
            ) : null}
          </button>
        )}

        {canEdit && !renaming ? (
          <span className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {isSection ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${node.title}`}
                    className="flex h-5 w-5 items-center justify-center rounded-[4px] text-ws-ink-3 hover:bg-[var(--ws-press)]"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onSelect={() => setRenaming(true)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Rename section
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onDeleteSection(node.id)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {!isSection ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${node.title}`}
                    className="flex h-5 w-5 items-center justify-center rounded-[4px] text-ws-ink-3 hover:bg-[var(--ws-press)]"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onSelect={() => setRenaming(true)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDuplicate(node.id)}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onMoveTo(node.id)}>
                    <FolderInput className="mr-2 h-3.5 w-3.5" /> Move to…
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onToggleFavorite(node.id)}>
                    {favorite ? <StarOff className="mr-2 h-3.5 w-3.5" /> : <Star className="mr-2 h-3.5 w-3.5" />}
                    {favorite ? "Remove from favorites" : "Add to favorites"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onArchive(node.id)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <button
              type="button"
              aria-label={isSection ? `Add page to ${node.title}` : `Add page inside ${node.title}`}
              onClick={() => onAddChild(node)}
              className="flex h-5 w-5 items-center justify-center rounded-[4px] text-ws-ink-3 hover:bg-[var(--ws-press)]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : null}
      </div>

      {hasChildren && open ? (
        <div role="group">
          {[...node.children].sort(bySort).map((child) => (
            <TreeRow key={child.id} {...props} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default PageTree;
