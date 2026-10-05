import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Bell, ChevronsUpDown, FilePlus2, FileText, ListChecks, PanelLeftClose, Search, Sparkles, Star, Trash2, Undo2, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAtlasUpdatesSeen } from "../hooks/useAtlasPrefs";
import type { AtlasPage } from "../source/types";
import type { TreeNode } from "../pageTree";
import PageTree, { type PageTreeProps } from "./PageTree";

export interface SidebarSpace {
  id: string;
  label: string;
  icon: LucideIcon;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface WorkspaceSidebarProps {
  tree: PageTreeProps;
  articles: AtlasPage[];
  archived: AtlasPage[];
  userId: string | null;
  /** Product and organisation names, from config / the host. */
  brand: { productName: string; workspaceName: string };
  space: SidebarSpace;
  spaces: SidebarSpace[];
  onSelectSpace: (id: string) => void;
  /** Pages and sections can be created here by this user. */
  canCreate: boolean;
  canEdit: boolean;
  pagePath: (page: AtlasPage) => string;
  showAssignments: boolean;
  /** Tree spaces list pages; database spaces browse them in the main view instead. */
  showTree: boolean;
  /** Links back into the host app, shown when Atlas has no site header (installed window). */
  appLinks?: { label: string; href: string }[];
  onSearch: () => void;
  onAskIris: () => void;
  onNewPage: () => void;
  onRestore: (id: string) => void;
  onCollapse: () => void;
  onCreateSection: (title: string) => Promise<void>;
  onOpenAssignments: () => void;
}

const SidebarButton = ({
  icon: Icon,
  label,
  hint,
  badge,
  onClick,
}: {
  icon: typeof Search;
  label: string;
  hint?: string;
  badge?: number;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-7 w-full items-center gap-2 rounded-[4px] px-2 text-left text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)] active:bg-[var(--ws-press)]"
  >
    <Icon className="h-3.5 w-3.5 shrink-0" />
    <span className="flex-1 truncate">{label}</span>
    {badge ? (
      <span className="rounded-[4px] bg-ws-accent px-1.5 text-[11px] font-semibold text-[hsl(var(--ws-accent-fg))]">{badge}</span>
    ) : null}
    {hint ? <kbd className="text-[11px] text-ws-ink-3">{hint}</kbd> : null}
  </button>
);

const WorkspaceSidebar = ({
  tree,
  articles,
  archived,
  userId,
  brand,
  space,
  spaces,
  onSelectSpace,
  canCreate,
  canEdit,
  pagePath,
  showAssignments,
  showTree,
  appLinks,
  onSearch,
  onAskIris,
  onNewPage,
  onRestore,
  onCollapse,
  onCreateSection,
  onOpenAssignments,
}: WorkspaceSidebarProps) => {
  const [sectionTitle, setSectionTitle] = useState("");
  const navigate = useNavigate();
  const { seenAt, markSeen } = useAtlasUpdatesSeen();

  const updates = useMemo(() => {
    const cutoff = Math.max(seenAt, Date.now() - WEEK_MS);
    return articles
      .filter((article) => article.status !== "archived" && new Date(article.updatedAt).getTime() > cutoff)
      .filter((article) => !userId || (article.lastEditedBy ?? article.authorId) !== userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [articles, seenAt, userId]);

  const recent = useMemo(
    () =>
      articles
        .filter((article) => article.status !== "archived")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8),
    [articles],
  );

  const nodeById = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const walk = (nodes: TreeNode[]) =>
      nodes.forEach((node) => {
        map.set(node.id, node);
        walk(node.children);
      });
    walk(tree.nodes);
    return map;
  }, [tree.nodes]);

  const favorites = tree.favoriteIds.map((id) => nodeById.get(id)).filter((node): node is TreeNode => Boolean(node));

  return (
    <>
      <div className="flex items-center gap-1 px-2 pb-1 pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[6px] px-2 text-left text-[14px] font-semibold text-ws-ink hover:bg-[var(--ws-hover)]"
            >
              <space.icon className="h-4 w-4 shrink-0 text-ws-accent" />
              <span className="flex-1 truncate">{space.label}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ws-ink-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <p className="ws-label px-2 py-1.5 text-ws-ink-3">
              {brand.productName} · {brand.workspaceName}
            </p>
            {spaces.map(({ id, label, icon: Icon }) => (
              <DropdownMenuItem key={id} onSelect={() => onSelectSpace(id)}>
                <Icon className="mr-2 h-3.5 w-3.5" /> {label}
              </DropdownMenuItem>
            ))}
            {appLinks && appLinks.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                {appLinks.map((link) => (
                  <DropdownMenuItem key={link.href} onSelect={() => window.open(link.href, "_blank", "noopener")}>
                    {link.label} ↗
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          aria-label="Collapse sidebar (Ctrl+\)"
          title="Collapse sidebar"
          onClick={onCollapse}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-ws-ink-3 hover:bg-[var(--ws-hover)]"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-px px-2 pb-2">
        <SidebarButton icon={Search} label="Search" hint="Ctrl K" onClick={onSearch} />
        <SidebarButton icon={Sparkles} label="Ask Iris" hint="Ctrl J" onClick={onAskIris} />
        <Popover onOpenChange={(open) => open && updates.length > 0 && markSeen()}>
          <PopoverTrigger asChild>
            <div>
              <SidebarButton icon={Bell} label="Updates" badge={updates.length} />
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1">
            <p className="ws-label px-2 py-1.5 text-ws-ink-3">Edited this week</p>
            {(updates.length > 0 ? updates : recent).slice(0, 8).map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => navigate(pagePath(article))}
                className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[14px] hover:bg-[var(--ws-hover)]"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-ws-ink-3" />
                <span className="min-w-0 flex-1 truncate">{article.title}</span>
                <span className="shrink-0 text-[11px] text-ws-ink-3">
                  {new Date(article.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </button>
            ))}
            {articles.length === 0 ? <p className="px-2 py-2 text-[13px] text-ws-ink-3">No pages yet.</p> : null}
          </PopoverContent>
        </Popover>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {favorites.length > 0 ? (
          <section aria-label="Favorites" className="px-2 pb-2">
            <p className="ws-label px-2 py-1.5 text-ws-ink-3">Favorites</p>
            {favorites.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => tree.onOpen(node)}
                className="flex h-7 w-full items-center gap-2 rounded-[4px] px-2 text-left text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]"
              >
                <Star className="h-3.5 w-3.5 shrink-0 text-ws-ink-3" />
                <span className="truncate">{node.title}</span>
              </button>
            ))}
          </section>
        ) : null}

        {showTree ? (
        <>
        <div className="flex items-center justify-between pr-3">
          <p className="ws-label px-4 py-1.5 text-ws-ink-3">Pages</p>
          {canCreate ? <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="rounded-[4px] px-1.5 text-[12px] text-ws-ink-3 hover:bg-[var(--ws-hover)]">
                New section
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const title = sectionTitle.trim();
                  if (!title) return;
                  await onCreateSection(title);
                  setSectionTitle("");
                }}
              >
                <input
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                  placeholder="Section name"
                  aria-label="Section name"
                  className="h-8 w-full border border-ws-input-border bg-ws-paper px-2 text-[14px] outline-none focus:border-ws-accent"
                />
              </form>
            </PopoverContent>
          </Popover> : null}
        </div>
        {tree.nodes.length > 0 ? (
          <PageTree {...tree} />
        ) : (
          <p className="px-4 py-2 text-[13px] text-ws-ink-3">{canCreate ? "No pages yet. Create the first one below." : "No pages to show."}</p>
        )}
        </>
        ) : null}
      </div>

      <div className="space-y-px border-t border-ws-line p-2">
        {canCreate ? (
          <button
            type="button"
            onClick={onNewPage}
            className="flex h-7 w-full min-w-0 items-center gap-2 rounded-[4px] px-2 text-left text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]"
          >
            <FilePlus2 className="h-3.5 w-3.5 shrink-0" /> New page
          </button>
        ) : null}
        <div className="flex items-center gap-1">
        {showAssignments ? (
          <button
            type="button"
            onClick={onOpenAssignments}
            className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-[4px] px-2 text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]"
          >
            <ListChecks className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Assignments</span>
          </button>
        ) : null}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-7 items-center gap-2 rounded-[4px] px-2 text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Trash
              {archived.length > 0 ? <span className="text-[11px] text-ws-ink-3">{archived.length}</span> : null}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-72 p-1">
            <p className="ws-label px-2 py-1.5 text-ws-ink-3">Archived pages</p>
            {archived.length === 0 ? <p className="px-2 py-2 text-[13px] text-ws-ink-3">Trash is empty.</p> : null}
            {archived.map((article) => (
              <div key={article.id} className="flex items-center gap-2 rounded-[4px] px-2 py-1.5 hover:bg-[var(--ws-hover)]">
                <span className="min-w-0 flex-1 truncate text-[14px]">{article.title}</span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onRestore(article.id)}
                    className="flex shrink-0 items-center gap-1 text-[13px] text-ws-accent hover:underline"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Restore
                  </button>
                ) : null}
              </div>
            ))}
          </PopoverContent>
        </Popover>
        </div>
      </div>
    </>
  );
};

export default WorkspaceSidebar;
