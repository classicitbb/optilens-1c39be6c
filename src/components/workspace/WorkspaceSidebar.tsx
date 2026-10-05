import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Bell, BookOpen, ChevronsUpDown, FilePlus2, FileText, Globe, ListChecks, PanelLeftClose, Search, Sparkles, Star, Trash2, Undo2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HelpArticle } from "@/hooks/useHelpArticles";
import type { HelpCenterNode } from "@/lib/helpCenter";
import { useState } from "react";
import { toAdminWikiArticlePath } from "@/lib/wikiArticleRouting";
import { useWikiUpdatesSeen } from "@/hooks/useWikiWorkspacePrefs";
import PageTree, { type PageTreeProps } from "./PageTree";

const SPACES = [
  { label: "Internal wiki", to: "/admin/knowledge/wiki", icon: BookOpen },
  { label: "SOPs", to: "/admin/knowledge/sops", icon: ListChecks },
  { label: "Website content", to: "/admin/website/content", icon: Globe },
] as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface WorkspaceSidebarProps {
  tree: PageTreeProps;
  articles: HelpArticle[];
  archived: HelpArticle[];
  userId: string | null;
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
  const { seenAt, markSeen } = useWikiUpdatesSeen();

  const updates = useMemo(() => {
    const cutoff = Math.max(seenAt, Date.now() - WEEK_MS);
    return articles
      .filter((article) => article.status !== "archived" && new Date(article.updated_at).getTime() > cutoff)
      .filter((article) => !userId || (article.last_edited_by ?? article.author_id) !== userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [articles, seenAt, userId]);

  const recent = useMemo(
    () =>
      articles
        .filter((article) => article.status !== "archived")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 8),
    [articles],
  );

  const nodeById = useMemo(() => {
    const map = new Map<string, HelpCenterNode>();
    const walk = (nodes: HelpCenterNode[]) =>
      nodes.forEach((node) => {
        map.set(node.id, node);
        walk(node.children);
      });
    walk(tree.nodes);
    return map;
  }, [tree.nodes]);

  const favorites = tree.favoriteIds.map((id) => nodeById.get(id)).filter((node): node is HelpCenterNode => Boolean(node));

  return (
    <>
      <div className="flex items-center gap-1 px-2 pb-1 pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[6px] px-2 text-left text-[14px] font-semibold text-ws-ink hover:bg-[var(--ws-hover)]"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-ws-accent" />
              <span className="flex-1 truncate">Internal wiki</span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ws-ink-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {SPACES.map(({ label, to, icon: Icon }) => (
              <DropdownMenuItem key={to} onSelect={() => navigate(to)}>
                <Icon className="mr-2 h-3.5 w-3.5" /> {label}
              </DropdownMenuItem>
            ))}
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
                onClick={() => navigate(toAdminWikiArticlePath({ id: article.id, title: article.title, slug: article.slug }))}
                className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[14px] hover:bg-[var(--ws-hover)]"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-ws-ink-3" />
                <span className="min-w-0 flex-1 truncate">{article.title}</span>
                <span className="shrink-0 text-[11px] text-ws-ink-3">
                  {new Date(article.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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

        <div className="flex items-center justify-between pr-3">
          <p className="ws-label px-4 py-1.5 text-ws-ink-3">Pages</p>
          <Popover>
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
          </Popover>
        </div>
        {tree.nodes.length > 0 ? (
          <PageTree {...tree} />
        ) : (
          <p className="px-4 py-2 text-[13px] text-ws-ink-3">No pages yet. Create the first one below.</p>
        )}
      </div>

      <div className="space-y-px border-t border-ws-line p-2">
        <button
          type="button"
          onClick={onNewPage}
          className="flex h-7 w-full min-w-0 items-center gap-2 rounded-[4px] px-2 text-left text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]"
        >
          <FilePlus2 className="h-3.5 w-3.5 shrink-0" /> New page
        </button>
        <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenAssignments}
          className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-[4px] px-2 text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]"
        >
          <ListChecks className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Assignments</span>
        </button>
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
                <button
                  type="button"
                  onClick={() => onRestore(article.id)}
                  className="flex shrink-0 items-center gap-1 text-[13px] text-ws-accent hover:underline"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Restore
                </button>
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
