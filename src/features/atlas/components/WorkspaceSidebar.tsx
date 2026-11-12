import { useContext, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  CalendarDays,
  ChevronsRight,
  ExternalLink,
  FileText,
  Home,
  Inbox,
  ListChecks,
  MessageCircle,
  MessageCirclePlus,
  PanelLeft,
  Plus,
  Search,
  SquarePen,
  Star,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { useAtlasUpdatesSeen } from "../hooks/useAtlasPrefs";
import type { AtlasPage } from "../source/types";
import type { TreeNode } from "../pageTree";
import PageTree, { type PageTreeProps } from "./PageTree";
import { SidebarPeekContext } from "./WorkspaceShell";

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

/** Sidebar text colour: the theme's sidebar grey, or secondary ink outside the Atlas theme. */
const SIDE_INK = "text-[hsl(var(--ws-side-ink,var(--ws-ink-2)))]";

/** One sidebar row: 30px tall, 18px icon, 14px medium text in the sidebar grey. */
const rowClass = `flex h-[30px] w-full min-w-0 items-center gap-2 rounded-[6px] px-2 text-left text-[14px] font-medium ${SIDE_INK} hover:bg-[var(--ws-hover)] active:bg-[var(--ws-press)]`;

/** Small square icon buttons in the sidebar's top row and pill row. */
const iconButtonClass = `flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] ${SIDE_INK} opacity-80 hover:bg-[var(--ws-hover)] hover:opacity-100`;

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
  <button type="button" onClick={onClick} className={rowClass}>
    <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
    <span className="flex-1 truncate">{label}</span>
    {badge ? (
      <span className="rounded-[4px] bg-ws-accent px-1.5 text-[11px] font-semibold text-[hsl(var(--ws-accent-fg))]">{badge}</span>
    ) : null}
    {hint ? <kbd className="text-[11px] font-normal text-ws-ink-3">{hint}</kbd> : null}
  </button>
);

const SectionLabel = ({ children }: { children: string }) => (
  <p className="px-2 pb-1 pt-4 text-[12px] font-medium text-ws-ink-3">{children}</p>
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

  const { peeking, pin } = useContext(SidebarPeekContext);
  const favorites = tree.favoriteIds.map((id) => nodeById.get(id)).filter((node): node is TreeNode => Boolean(node));

  const onUpdatesOpen = (open: boolean) => {
    if (open && updates.length > 0) markSeen();
  };

  const updatesList = (
    <PopoverContent align="start" className="w-72 p-1">
      <p className="ws-label px-2 py-1.5 text-ws-ink-3">Edited this week</p>
      {(updates.length > 0 ? updates : recent).slice(0, 8).map((article) => (
        <button
          key={article.id}
          type="button"
          onClick={() => navigate(pagePath(article))}
          className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[14px] hover:bg-[var(--ws-hover)]"
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
  );

  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-1 px-3">
        {peeking ? (
          <button type="button" aria-label="Keep sidebar open" title="Keep sidebar open" onClick={pin} className={iconButtonClass}>
            <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        ) : (
          <button type="button" aria-label="Collapse sidebar (Ctrl+\)" title="Collapse sidebar" onClick={onCollapse} className={iconButtonClass}>
            <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        )}
        <span className="flex-1" />
        <Popover onOpenChange={onUpdatesOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Updates" title="Updates" className={cn(iconButtonClass, "relative")}>
              <Inbox className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {updates.length > 0 ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-ws-accent" /> : null}
            </button>
          </PopoverTrigger>
          {updatesList}
        </Popover>
        {canCreate ? (
          <button type="button" aria-label="New page" title="New page" onClick={onNewPage} className={iconButtonClass}>
            <SquarePen className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 px-3 pb-2">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-8 w-full items-center gap-2 rounded-[8px] border border-ws-line px-2.5 text-left text-[14px] text-ws-ink-3 hover:bg-[var(--ws-hover)]"
        >
          <span className="flex-1 truncate">Search or ask</span>
          <kbd className="rounded-[4px] bg-ws-line px-1 font-sans text-[11px] text-ws-ink-2">Ctrl+K</kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1 px-3 pb-2">
        <button
          type="button"
          onClick={() => onSelectSpace(space.id)}
          className="flex h-[30px] min-w-0 items-center gap-1.5 rounded-[8px] bg-ws-side-hover px-2.5 text-[14px] font-semibold text-ws-ink"
        >
          <Home className="h-4 w-4 shrink-0" /> <span className="truncate">Home</span>
        </button>
        <button type="button" aria-label="Ask Iris (Ctrl+J)" title="Ask Iris" onClick={onAskIris} className={iconButtonClass}>
          <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <Popover onOpenChange={onUpdatesOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Recent pages" title="Recent pages" className={iconButtonClass}>
              <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </PopoverTrigger>
          {updatesList}
        </Popover>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-px">
          {canCreate ? <SidebarButton icon={SquarePen} label="New page" onClick={onNewPage} /> : null}
          <SidebarButton icon={MessageCirclePlus} label="Ask Iris" hint="Ctrl J" onClick={onAskIris} />
          {showAssignments ? <SidebarButton icon={ListChecks} label="Assignments" onClick={onOpenAssignments} /> : null}
        </div>

        {favorites.length > 0 ? (
          <section aria-label="Favorites">
            <SectionLabel>Favorites</SectionLabel>
            {favorites.map((node) => (
              <button key={node.id} type="button" onClick={() => tree.onOpen(node)} className={rowClass}>
                <Star className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
                <span className="truncate">{node.title}</span>
              </button>
            ))}
          </section>
        ) : null}

        <section aria-label="Spaces">
          <SectionLabel>Spaces</SectionLabel>
          <div className="flex h-[30px] items-center gap-2 px-2 text-[14px] font-semibold text-ws-ink" title={brand.productName}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[hsl(var(--ws-c-orange))] text-[11px] font-bold text-white">
              {brand.workspaceName.trim().charAt(0).toUpperCase() || "A"}
            </span>
            <span className="truncate">{brand.workspaceName}</span>
          </div>
          {spaces.map(({ id, label, icon: Icon }) => {
            const current = id === space.id;
            return (
              <div key={id}>
                <div
                  className={cn(
                    "group flex h-[30px] items-center gap-1 rounded-[6px] pl-3 pr-1 hover:bg-[var(--ws-hover)]",
                    current && !tree.activeId && "bg-ws-side-hover",
                  )}
                >
                  <button
                    type="button"
                    aria-current={current ? "page" : undefined}
                    onClick={() => onSelectSpace(id)}
                    className={cn("flex min-w-0 flex-1 items-center gap-2 text-left text-[14px] font-medium", SIDE_INK)}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
                    <span className={cn("truncate", current && "text-ws-ink")}>{label}</span>
                  </button>
                  {current && showTree && canCreate ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="New section"
                          title="New section"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-ws-ink-3 opacity-0 hover:bg-[var(--ws-press)] focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                        >
                          <Plus className="h-4 w-4" />
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
                            className="h-8 w-full rounded-[6px] border border-ws-input-border bg-ws-paper px-2 text-[14px] outline-none focus:border-ws-accent"
                          />
                        </form>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
                {current && showTree ? (
                  <div className="pl-3">
                    {tree.nodes.length > 0 ? (
                      <PageTree {...tree} />
                    ) : (
                      <p className="py-1 pl-9 text-[14px] text-ws-ink-3">{canCreate ? "No pages inside" : "No pages to show"}</p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      </div>

      <div className="shrink-0 space-y-px px-2 pb-2 pt-1">
        {appLinks?.map((link) => (
          <button key={link.href} type="button" onClick={() => window.open(link.href, "_blank", "noopener")} className={rowClass}>
            <ExternalLink className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
            <span className="truncate">{link.label}</span>
          </button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={rowClass}>
              <Trash2 className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
              <span className="flex-1 truncate">Trash</span>
              {archived.length > 0 ? <span className="text-[12px] text-ws-ink-3">{archived.length}</span> : null}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-72 p-1">
            <p className="ws-label px-2 py-1.5 text-ws-ink-3">Archived pages</p>
            {archived.length === 0 ? <p className="px-2 py-2 text-[13px] text-ws-ink-3">Trash is empty.</p> : null}
            {archived.map((article) => (
              <div key={article.id} className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[var(--ws-hover)]">
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
    </>
  );
};

export default WorkspaceSidebar;
