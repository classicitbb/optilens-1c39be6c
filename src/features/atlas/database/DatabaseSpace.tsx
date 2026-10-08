import { Suspense, useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { LayoutGrid, Plus, Rows3, Table2, type LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminRoleSafe } from "@/contexts/AdminRoleContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AtlasCapabilities } from "../capabilities";
import type { EditorPage, EditorPerson } from "../components/BlockEditor";
import { atlasPath } from "../config";
import { getAtlasHost } from "../host";
import type { useAtlasData } from "../hooks/useAtlas";
import { toPageSlug } from "../pageTree";
import { defaultPropsFor, type AtlasOption, type AtlasSpaceDef, type AtlasView } from "../spaces";
import type { AtlasPage, AtlasStatus } from "../source/types";
import { BoardView, GalleryView, TableView, titleOf } from "./DatabaseViews";
import { groupByStatus, parseSort, parseStatusFilter, selectRows, type SortKey, type StatusFilter } from "./databaseModel";
import { publishPages } from "./publishPages";
import PagePeek from "./PagePeek";

interface DatabaseSpaceProps {
  space: AtlasSpaceDef;
  data: ReturnType<typeof useAtlasData>;
  spacePages: AtlasPage[];
  capabilities: AtlasCapabilities;
  onAskIris: () => void;
  dynamicOptions: Record<string, AtlasOption[]>;
  editorPages: EditorPage[];
  searchPeople: (query: string) => Promise<EditorPerson[]>;
  resolvePageHref: (page: { id?: string; slug?: string; title: string }) => string | undefined;
  supportsDrafts: boolean;
}

const VIEW_META: Record<AtlasView, { label: string; icon: LucideIcon }> = {
  table: { label: "Table", icon: Table2 },
  board: { label: "Board", icon: Rows3 },
  gallery: { label: "Gallery", icon: LayoutGrid },
};

const parseView = (value: string | null, space: AtlasSpaceDef): AtlasView =>
  space.views.includes(value as AtlasView) ? (value as AtlasView) : space.defaultView;

/**
 * A database space: saved-view tabs, a Table / Board / Gallery layout, filters, bulk actions and a
 * side peek. Every write goes through the same editor session and validators as a full page.
 */
const DatabaseSpace = ({ space, data, spacePages, capabilities, onAskIris, dynamicOptions, editorPages, searchPeople, resolvePageHref, supportsDrafts }: DatabaseSpaceProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const adminRole = useAdminRoleSafe();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<{ id: string; from: string; to: string } | null>(null);

  const tabId = params.get("tab") ?? space.savedViews[0]?.id ?? "all";
  const view = space.savedViews.find((candidate) => candidate.id === tabId) ?? space.savedViews[0];
  const layout = parseView(params.get("view"), space);
  const status = parseStatusFilter(params.get("status"));
  const sort = parseSort(params.get("sort"));
  const q = params.get("q") ?? "";
  const peekSlug = params.get("peek");

  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const query = useMemo(() => ({ view, status, q, sort }), [view, status, q, sort]);
  const rows = useMemo(() => selectRows(spacePages, query), [spacePages, query]);
  const boardGroups = useMemo(() => groupByStatus(selectRows(spacePages, query, { ignoreStatus: true })), [spacePages, query]);
  const columns = useMemo(() => space.properties.filter((property) => property.column), [space.properties]);
  const typeColumn = space.properties.find((property) => property.key === "contentType");
  const peekPage = peekSlug ? (spacePages.find((page) => toPageSlug(page) === peekSlug)
    ?? (renaming && (peekSlug === renaming.from || peekSlug === renaming.to) ? spacePages.find((page) => page.id === renaming.id) : null)
    ?? null) : null;
  const canBulk = capabilities.edit;

  const clearSelection = () => setSelected(new Set());
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected((current) => (rows.every((row) => current.has(row.id)) ? new Set() : new Set(rows.map((row) => row.id))));

  const selectedPages = useMemo(() => spacePages.filter((page) => selected.has(page.id)), [selected, spacePages]);

  const report = (okCount: number, failed: { title: string; message: string }[], verb: string) => {
    if (okCount > 0) toast({ title: `${verb} ${okCount} ${okCount === 1 ? "page" : "pages"}` });
    if (failed.length > 0) {
      toast({
        title: `${failed.length} could not be published`,
        description: failed.map((failure) => `${failure.title}: ${failure.message}`).join("\n"),
        variant: "destructive",
      });
    }
  };

  const publishSelected = async () => {
    if (!capabilities.publish) return;
    const result = await publishPages(selectedPages, data.saveVersion, "Published from a database view");
    report(result.ok.length, result.failed, "Published");
    setSelected(new Set(result.failed.map((failure) => failure.id)));
  };

  const setStatusFor = async (pages: AtlasPage[], next: Exclude<AtlasStatus, "published">) => {
    if (!capabilities.edit) return;
    await Promise.all(pages.map((page) => data.patchPage({ id: page.id, status: next })));
    toast({ title: next === "draft" ? "Moved to draft" : "Archived", description: `${pages.length} ${pages.length === 1 ? "page" : "pages"}` });
  };

  // Dragging to Published validates first; a failing page stays where it was.
  const moveCard = async (page: AtlasPage, to: AtlasStatus) => {
    if (to === "published") {
      if (!capabilities.publish) {
        toast({ title: "Publishing permission required", variant: "destructive" });
        return;
      }
      const result = await publishPages([page], data.saveVersion, "Published from the board");
      if (result.failed.length > 0) report(0, result.failed, "Published");
      else toast({ title: "Published", description: titleOf(page) });
      return;
    }
    await setStatusFor([page], to);
  };

  const createRow = async () => {
    if (!capabilities.edit || !space.allowCreate) return;
    const slug = `untitled-${Date.now().toString(36)}`;
    try {
      await data.createPage({
        spaceId: space.scope.storeSpace,
        title: "Untitled",
        slug,
        sortOrder: spacePages.reduce((max, page) => Math.max(max, page.sortOrder), -1) + 1,
        status: "draft",
        props: defaultPropsFor(space, view),
      });
      setParam("peek", slug);
    } catch (error) {
      toast({ title: "Could not create page", description: error instanceof Error ? error.message : "Try again in a moment.", variant: "destructive" });
    }
  };

  const removePage = async (page: AtlasPage) => {
    if (!capabilities.remove) return;
    if (!window.confirm(`Delete “${titleOf(page)}” permanently? This cannot be undone.`)) return;
    try {
      await data.removePage(page.id);
      toast({ title: "Deleted", description: titleOf(page) });
      setParam("peek", null);
    } catch (error) {
      toast({ title: "Could not delete", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  };

  const Embed = view?.embed ? getAtlasHost().embeds?.[view.embed] : undefined;
  const Icon = space.icon;

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-[1100px] px-6 pt-6 sm:px-10">
        <div className="flex items-center gap-3">
          <Icon className="h-7 w-7 text-ws-accent" />
          <h1 className="text-[34px] font-bold leading-tight text-ws-ink">{space.title ?? space.label}</h1>
        </div>
        <p className="mt-1 text-[14px] text-ws-ink-3">{space.description}</p>

        <div role="tablist" aria-label="Saved views" className="mt-4 flex gap-1 overflow-x-auto border-b border-ws-line">
          {space.savedViews.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={candidate.id === view?.id}
              title={candidate.description}
              onClick={() => {
                clearSelection();
                setParams(
                  (current) => {
                    const next = new URLSearchParams(current);
                    next.delete("peek");
                    if (candidate.id === space.savedViews[0]?.id) next.delete("tab");
                    else next.set("tab", candidate.id);
                    return next;
                  },
                  { replace: true },
                );
              }}
              className={cn(
                "-mb-px h-10 shrink-0 border-b-2 px-3 text-[14px]",
                candidate.id === view?.id ? "border-ws-accent font-semibold text-ws-ink" : "border-transparent text-ws-ink-3 hover:text-ws-ink",
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>
      </div>

      {Embed ? (
        <div className="mx-auto w-full max-w-[1100px] flex-1 px-6 pb-8 pt-4 sm:px-10">
          <Suspense fallback={<p className="py-8 text-[14px] text-ws-ink-3">Loading…</p>}>
            <Embed canEdit={adminRole.canEdit} isAdmin={adminRole.isAdmin} />
          </Suspense>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1100px] flex-1 px-6 pb-12 sm:px-10">
          <div className="flex flex-wrap items-center gap-2 py-3">
            <div role="group" aria-label="Layout" className="flex rounded-[6px] border border-ws-line">
              {space.views.map((candidate) => {
                const meta = VIEW_META[candidate];
                return (
                  <button
                    key={candidate}
                    type="button"
                    aria-pressed={layout === candidate}
                    onClick={() => setParam("view", candidate === space.defaultView ? null : candidate)}
                    className={cn("flex h-8 items-center gap-1.5 px-2.5 text-[13px]", layout === candidate ? "bg-ws-accent-tint font-medium text-ws-ink" : "text-ws-ink-3 hover:text-ws-ink")}
                  >
                    <meta.icon className="h-3.5 w-3.5" /> {meta.label}
                  </button>
                );
              })}
            </div>
            {layout !== "board" ? (
              <Select value={status} onValueChange={(value) => setParam("status", value === "active" ? null : value)}>
                <SelectTrigger aria-label="Status filter" className="h-8 w-[140px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            <Select value={sort} onValueChange={(value) => setParam("sort", value === "updated" ? null : value)}>
              <SelectTrigger aria-label="Sort" className="h-8 w-[150px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="title">Title A–Z</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="search"
              value={q}
              onChange={(event) => setParam("q", event.target.value || null)}
              placeholder="Search titles…"
              aria-label="Search titles"
              className="ws-bare-input h-8 min-w-[160px] flex-1 border-b border-ws-line bg-transparent px-1 text-[14px] outline-none focus:border-ws-accent"
            />
            {capabilities.edit && space.allowCreate ? (
              <button
                type="button"
                onClick={() => void createRow()}
                className="flex h-8 items-center gap-1.5 rounded-[6px] bg-ws-accent px-3 text-[14px] font-semibold text-[hsl(var(--ws-accent-fg))] hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> New
              </button>
            ) : null}
          </div>

          {selected.size > 0 && canBulk ? (
            <div role="toolbar" aria-label="Bulk actions" className="mb-2 flex flex-wrap items-center gap-2 rounded-[6px] border border-ws-line bg-ws-accent-tint px-3 py-2 text-[14px]">
              <span className="font-medium">{selected.size} selected</span>
              <span className="flex-1" />
              {capabilities.publish ? (
                <button type="button" onClick={() => void publishSelected()} className="rounded-[6px] bg-ws-accent px-3 py-1 text-[13px] font-semibold text-[hsl(var(--ws-accent-fg))]">
                  Publish
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void setStatusFor(selectedPages, "draft");
                  clearSelection();
                }}
                className="rounded-[6px] px-3 py-1 text-[13px] hover:bg-[var(--ws-hover)]"
              >
                Move to draft
              </button>
              <button
                type="button"
                onClick={() => {
                  void setStatusFor(selectedPages, "archived");
                  clearSelection();
                }}
                className="rounded-[6px] px-3 py-1 text-[13px] hover:bg-[var(--ws-hover)]"
              >
                Archive
              </button>
              <button type="button" onClick={clearSelection} className="rounded-[6px] px-3 py-1 text-[13px] hover:bg-[var(--ws-hover)]">
                Clear
              </button>
            </div>
          ) : null}

          {data.isLoading ? <p className="py-8 text-[14px] text-ws-ink-3">Loading…</p> : null}
          {!data.isLoading && layout === "table" ? (
            <TableView
              rows={rows}
              columns={columns}
              selected={selected}
              canSelect={canBulk}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onOpen={(page) => setParam("peek", toPageSlug(page))}
            />
          ) : null}
          {!data.isLoading && layout === "board" ? (
            <BoardView groups={boardGroups} canMove={canBulk} onOpen={(page) => setParam("peek", toPageSlug(page))} onMove={(page, to) => void moveCard(page, to)} typeColumn={typeColumn} />
          ) : null}
          {!data.isLoading && layout === "gallery" ? <GalleryView rows={rows} typeColumn={typeColumn} onOpen={(page) => setParam("peek", toPageSlug(page))} /> : null}
        </div>
      )}

      {peekPage ? (
        <PagePeek
          key={peekPage.id}
          page={peekPage}
          pages={data.pages}
          space={space}
          data={data}
          capabilities={capabilities}
          dynamicOptions={dynamicOptions}
          editorPages={editorPages}
          searchPeople={searchPeople}
          resolvePageHref={resolvePageHref}
          routeSlug={peekSlug as string}
          onClose={() => setParam("peek", null)}
          onOpenFull={() => navigate(atlasPath(space.id, toPageSlug(peekPage)))}
          onAskIris={onAskIris}
          onSlugChanging={(slug) => setRenaming({ id: peekPage.id, from: peekSlug!, to: slug })}
          onSlugChanged={async (slug) => {
            await data.refresh();
            setParam("peek", slug);
            setRenaming(null);
          }}
          onStatus={(next) => {
            void setStatusFor([peekPage], next);
            if (next === "archived") setParam("peek", null);
          }}
          onRemove={() => void removePage(peekPage)}
        />
      ) : null}
    </div>
  );
};

export default DatabaseSpace;
