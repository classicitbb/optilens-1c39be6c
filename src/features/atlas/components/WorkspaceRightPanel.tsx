import { useQuery } from "@tanstack/react-query";
import { History, MessageSquare, Sparkles, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtlasVersion } from "../source/types";

export type PanelTab = "iris" | "comments" | "history";
export const PANEL_TABS: { id: PanelTab; label: string; icon: typeof Sparkles }[] = [
  { id: "iris", label: "Iris", icon: Sparkles },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "history", label: "History", icon: History },
];

export const parsePanelTab = (value: string | null): PanelTab | null =>
  PANEL_TABS.some((tab) => tab.id === value) ? (value as PanelTab) : null;

interface WorkspaceRightPanelProps {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
  articleId: string | null;
  loadVersions: (articleId: string) => Promise<AtlasVersion[]>;
  onRestore: (version: AtlasVersion) => void;
  canRestore: boolean;
}

const Empty = ({ title, body }: { title: string; body: string }) => (
  <div className="px-4 py-8 text-center">
    <p className="text-[14px] font-semibold text-ws-ink">{title}</p>
    <p className="mt-1 text-[13px] leading-5 text-ws-ink-3">{body}</p>
  </div>
);

const HistoryList = ({
  articleId,
  onRestore,
  canRestore,
  loadVersions,
}: Pick<WorkspaceRightPanelProps, "articleId" | "onRestore" | "canRestore" | "loadVersions">) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["help_article_versions", articleId],
    queryFn: () => loadVersions(articleId as string),
    enabled: Boolean(articleId),
  });

  if (!articleId) return <Empty title="No page open" body="Open a page to see its version history." />;
  if (isLoading) return <p className="px-4 py-6 text-[13px] text-ws-ink-3">Loading history…</p>;
  if (error) {
    const detail = error instanceof Error ? error.message : (error as { message?: string })?.message;
    return <Empty title="Could not load history" body={detail || "Check your connection and reopen the panel."} />;
  }
  if (!data || data.length === 0) return <Empty title="No versions yet" body="Versions are saved each time the page is saved." />;

  return (
    <ul className="divide-y divide-ws-line">
      {data.map((version, index) => (
        <li key={version.id} className="flex items-start gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-ws-ink">
              Version {version.number}
              {index === 0 ? <span className="ws-label ml-2 text-[10px] text-ws-accent">Current</span> : null}
            </p>
            <p className="text-[12px] text-ws-ink-3">
              {new Date(version.savedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            {version.note ? <p className="mt-0.5 truncate text-[13px] text-ws-ink-2">{version.note}</p> : null}
          </div>
          {index > 0 && canRestore ? (
            <button
              type="button"
              onClick={() => onRestore(version)}
              className="flex shrink-0 items-center gap-1 rounded-[4px] px-1.5 py-1 text-[13px] text-ws-accent hover:bg-[var(--ws-hover)]"
            >
              <Undo2 className="h-3.5 w-3.5" /> Restore
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

const WorkspaceRightPanel = ({ tab, onTabChange, onClose, ...history }: WorkspaceRightPanelProps) => (
  <>
    <div className="flex items-center border-b border-ws-line pr-2">
      <div role="tablist" aria-label="Page panel" className="flex flex-1">
        {PANEL_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex h-10 items-center gap-1.5 border-b-2 px-3 text-[14px]",
              tab === id ? "border-ws-accent font-semibold text-ws-ink" : "border-transparent text-ws-ink-3 hover:text-ws-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-ws-ink-3 hover:bg-[var(--ws-hover)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
    <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
      {tab === "iris" ? (
        <Empty title="Iris isn't connected yet" body="Asking Iris about this page arrives with the Iris integration phase." />
      ) : null}
      {tab === "comments" ? <Empty title="Comments aren't available yet" body="Page comments need their own storage and aren't part of this release." /> : null}
      {tab === "history" ? <HistoryList {...history} /> : null}
    </div>
  </>
);

export default WorkspaceRightPanel;
