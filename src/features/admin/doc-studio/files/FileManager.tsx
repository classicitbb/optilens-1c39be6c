import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileText, LayoutGrid, List, MoreHorizontal, RefreshCw, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  filterDocFiles, normalizeDocFile, sortDocFiles, TYPE_LABELS,
  type AccessFilter, type DocFile, type SortCol,
} from "./docFiles";

/* eslint-disable @typescript-eslint/no-explicit-any */
type StudioApp = {
  state: Record<string, any>;
  setState: (patch: Record<string, unknown>) => void;
  openFile: (item: unknown) => Promise<void>;
  renameFileFromList: (item: unknown) => Promise<void>;
  openFileShare: (item: unknown) => Promise<void>;
  deleteFileFromList: (item: unknown) => Promise<void>;
  refreshMyFiles: () => Promise<unknown> | void;
};
const app = () => (window as unknown as { _dsApp?: StudioApp })._dsApp;

const ACCESS: [AccessFilter, string][] = [
  ["", "All"], ["owner", "Mine"], ["shared", "Shared"], ["edit", "Can edit"], ["view", "View only"], ["draft", "Drafts"],
];

const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const toItem = (f: DocFile) => ({ id: f.id, kind: f.kind, fileType: f.fileType, fileName: f.fileName, isOwner: f.isOwner, accessLevel: f.accessLevel });

/** Reads the studio's file state and re-renders whenever it changes. */
function useStudioFiles() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("ds:files-state", on);
    return () => window.removeEventListener("ds:files-state", on);
  }, []);
  return useMemo(() => {
    const s = app()?.state ?? {};
    return {
      files: ((s.myFiles as Record<string, unknown>[]) ?? []).map(normalizeDocFile),
      type: (s.fileTypeFilter as string) || "",
      search: (s.fileSearch as string) || "",
      error: (s.myFilesError as string) || "",
      loaded: Boolean(s.myFilesLoaded),
      tab: s.tab as string,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
}

/** Finds the empty slot the studio renders on its My Files tab. */
function useSlot(host: HTMLElement | null) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!host) return;
    const find = () => setSlot(host.querySelector<HTMLElement>("#ds-native-files-slot"));
    find();
    const mo = new MutationObserver(find);
    mo.observe(host, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [host]);
  return slot;
}

function FileMenuItems({ f, Item, Sep }: { f: DocFile; Item: typeof ContextMenuItem | typeof DropdownMenuItem; Sep: typeof ContextMenuSeparator | typeof DropdownMenuSeparator }) {
  const a = app();
  return (
    <>
      <Item className="rounded-none" onSelect={() => a?.openFile(toItem(f))}>Open</Item>
      {f.isOwner && (
        <>
          <Sep />
          <Item className="rounded-none" onSelect={() => a?.renameFileFromList(toItem(f))}>Rename</Item>
          <Item className="rounded-none" onSelect={() => a?.openFileShare(toItem(f))}>Share</Item>
          <Sep />
          <Item className="rounded-none text-destructive" onSelect={() => a?.deleteFileFromList(toItem(f))}>Delete</Item>
        </>
      )}
    </>
  );
}

function Panel() {
  const { files, type, search, error, loaded } = useStudioFiles();
  const [access, setAccess] = useState<AccessFilter>("");
  const [view, setView] = useState<"grid" | "list">(() => (localStorage.getItem("ds-files-view") === "list" ? "list" : "grid"));
  const [sort, setSort] = useState<{ col: SortCol; dir: 1 | -1 }>({ col: "date", dir: -1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => localStorage.setItem("ds-files-view", view), [view]);

  const shown = useMemo(
    () => sortDocFiles(filterDocFiles(files, { type, access, search }), sort.col, sort.dir),
    [files, type, access, search, sort],
  );
  const sel = shown.find((f) => f.id === selected) ?? null;

  const open = (f: DocFile) => app()?.openFile(toItem(f));
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await app()?.refreshMyFiles(); } finally { setRefreshing(false); }
  }, []);
  const setSearch = (v: string) => app()?.setState({ fileSearch: v });
  const sortBy = (col: SortCol) => setSort((s) => ({ col, dir: s.col === col ? (s.dir === 1 ? -1 : 1) : col === "date" ? -1 : 1 }));

  const onKey = (e: KeyboardEvent, f: DocFile) => {
    if (e.key === "Enter") { e.preventDefault(); open(f); }
    else if (e.key === " ") { e.preventDefault(); setSelected(f.id); }
  };

  const fileRow = (f: DocFile, body: ReactNode, className: string) => (
    <ContextMenu key={f.id} onOpenChange={(o) => o && setSelected(f.id)}>
      <ContextMenuTrigger asChild>
        <div
          role="option"
          aria-selected={selected === f.id}
          tabIndex={0}
          data-ds-file={f.id}
          onClick={() => setSelected(f.id)}
          onDoubleClick={() => open(f)}
          onKeyDown={(e) => onKey(e, f)}
          className={cn(className, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring", selected === f.id && "bg-accent text-accent-foreground")}
        >
          {body}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`More actions for ${f.fileName}`} onClick={(e) => e.stopPropagation()} className="p-1 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <FileMenuItems f={f} Item={DropdownMenuItem} Sep={DropdownMenuSeparator} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="rounded-none">
        <FileMenuItems f={f} Item={ContextMenuItem} Sep={ContextMenuSeparator} />
      </ContextMenuContent>
    </ContextMenu>
  );

  const typeBadge = (f: DocFile) => (
    <span className="border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {TYPE_LABELS[f.fileType] ?? f.fileType}
    </span>
  );
  const draftBadge = (f: DocFile) =>
    f.status === "draft" ? (
      <span className="bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">{f.createdByCopilot ? "AI draft" : "Draft"}</span>
    ) : null;

  const sortHead = (col: SortCol, label: string) => (
    <button type="button" onClick={() => sortBy(col)} className={cn("text-left uppercase", sort.col === col ? "text-foreground" : "text-muted-foreground")}>
      {label}{sort.col === col ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground" data-ds-file-manager>
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="relative w-64">
          <Input aria-label="Search files" placeholder="Search name, customer or content" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 rounded-none pr-7" />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Access filter">
          {ACCESS.map(([v, l]) => (
            <Button key={v || "all"} type="button" size="sm" variant={access === v ? "default" : "outline"} aria-pressed={access === v} className="h-8 rounded-none" onClick={() => setAccess(v)}>{l}</Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-none" disabled={!sel} onClick={() => sel && open(sel)}>Open</Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-none" aria-label="Refresh files" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Button type="button" size="icon" variant={view === "grid" ? "default" : "outline"} className="h-8 w-8 rounded-none" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={view === "list" ? "default" : "outline"} className="h-8 w-8 rounded-none" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="border-b border-border px-3 py-1 text-[11px] text-muted-foreground">
        {shown.length} of {files.length} files{type ? ` · ${TYPE_LABELS[type] ?? type}` : ""} · Double-click or Enter to open · Right-click for options
      </div>
      {error && <div role="alert" className="border-b border-destructive/40 px-3 py-2 text-sm text-destructive">Couldn't load files: {error}. Press refresh to try again.</div>}
      <div role="listbox" aria-label="Saved files" className="min-h-0 flex-1 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
        {!loaded && !error && files.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Loading files…</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No files match these filters.</p>
        ) : view === "grid" ? (
          <div className="grid gap-3 p-3 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
            {shown.map((f) =>
              fileRow(
                f,
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex h-20 items-center justify-center bg-muted"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                  <div className="truncate text-sm font-semibold" title={f.fileName}>{f.fileName}</div>
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    {typeBadge(f)}{draftBadge(f)}<span>{fmtDate(f.updatedAt)}</span>
                    {!f.isOwner && <Users className="h-3 w-3" aria-label="Shared with you" />}
                  </div>
                </div>,
                "flex items-start gap-1 border border-border bg-card p-2 hover:border-primary",
              ),
            )}
          </div>
        ) : (
          <div>
            <div className="sticky top-0 z-10 grid grid-cols-[1fr_110px_180px_110px_28px] gap-2 border-b border-border bg-muted px-3 py-1.5 text-[10px] font-semibold tracking-wide">
              {sortHead("name", "Name")}{sortHead("type", "Type")}{sortHead("customer", "Customer")}{sortHead("date", "Updated")}<span />
            </div>
            {shown.map((f) =>
              fileRow(
                f,
                <>
                  <div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm">{f.fileName}</span>{draftBadge(f)}{!f.isOwner && <Users className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Shared with you" />}</div>
                  <div>{typeBadge(f)}</div>
                  <div className="truncate text-sm text-muted-foreground">{f.customerName || "—"}</div>
                  <div className="text-sm text-muted-foreground">{fmtDate(f.updatedAt)}</div>
                </>,
                "grid grid-cols-[1fr_110px_180px_110px_28px] items-center gap-2 border-b border-border px-3 py-2 hover:bg-muted/60",
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Portals the native file manager into the studio's My Files slot. */
export default function DocStudioFileManager({ host }: { host: HTMLElement | null }) {
  const slot = useSlot(host);
  return slot ? createPortal(<Panel />, slot) : null;
}
