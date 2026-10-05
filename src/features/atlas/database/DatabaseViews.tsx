import { useState, type DragEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatRelative } from "../components/PageHeader";
import { getAtlasHost, optionSet } from "../host";
import type { AtlasPropertyDef } from "../spaces";
import type { AtlasPage, AtlasStatus } from "../source/types";
import { STATUS_ORDER, bodyPreview } from "./databaseModel";

const STATUS_TONE: Record<AtlasStatus, string> = {
  draft: "ws-bg-gray ws-color-gray",
  published: "ws-bg-green ws-color-green",
  archived: "ws-bg-red ws-color-red",
};
const STATUS_LABEL: Record<AtlasStatus, string> = { draft: "Draft", published: "Published", archived: "Archived" };

export const StatusPill = ({ status }: { status: AtlasStatus }) => (
  <span className={cn("inline-block rounded-[4px] px-2 py-0.5 text-[12px] font-medium", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>
);

const Pill = ({ children }: { children: string }) => (
  <span className="inline-block max-w-full truncate rounded-[4px] bg-ws-side-hover px-2 py-0.5 text-[12px] text-ws-ink-2">{children}</span>
);

export const titleOf = (page: AtlasPage): string => page.draftTitle ?? page.title ?? "Untitled";

/** Label for a property value, from the property's own options or the host's named option set. */
const labelFor = (def: AtlasPropertyDef, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  const options = def.options ?? (def.optionsRef ? optionSet(def.optionsRef) : []);
  return options.find((option) => option.value === value)?.label ?? String(value);
};

const contextLabel = (slug: string) => (getAtlasHost().contextOptions ?? []).find((option) => option.value === slug)?.label ?? slug;

const Cell = ({ def, page }: { def: AtlasPropertyDef; page: AtlasPage }) => {
  if (def.key === "status") return <StatusPill status={page.status} />;
  if (def.type === "contexts") {
    const real = page.contexts.filter((slug) => slug !== "all");
    if (real.length === 0) return <span className="text-ws-ink-3">—</span>;
    return (
      <span className="text-[13px] text-ws-ink-2" title={real.map(contextLabel).join(", ")}>
        {real.length} {real.length === 1 ? "context" : "contexts"}
      </span>
    );
  }
  const value = def.target === "field" ? (page as unknown as Record<string, unknown>)[def.key] : page.props[def.key];
  if (def.type === "toggle") return <span className="text-[13px] text-ws-ink-2">{value === false ? "Off" : "On"}</span>;
  const label = labelFor(def, value);
  return label ? <Pill>{label}</Pill> : <span className="text-ws-ink-3">—</span>;
};

interface TableViewProps {
  rows: AtlasPage[];
  columns: AtlasPropertyDef[];
  selected: Set<string>;
  canSelect: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (page: AtlasPage) => void;
}

export const TableView = ({ rows, columns, selected, canSelect, onToggle, onToggleAll, onOpen }: TableViewProps) => {
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-ws-line">
            <th className="w-9 px-3 py-2">
              {canSelect ? <Checkbox aria-label="Select all rows" checked={allSelected} onCheckedChange={onToggleAll} /> : null}
            </th>
            <th className="ws-label px-3 py-2 text-ws-ink-3">Title</th>
            {columns.map((def) => (
              <th key={`${def.key}-${def.type}`} className="ws-label px-3 py-2 text-ws-ink-3">
                {def.label}
              </th>
            ))}
            <th className="ws-label px-3 py-2 text-ws-ink-3">Updated</th>
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {rows.map((page) => (
            <tr
              key={page.id}
              onClick={() => onOpen(page)}
              className={cn("group/row cursor-pointer border-b border-ws-line hover:bg-[var(--ws-hover)]", selected.has(page.id) && "bg-ws-accent-tint")}
            >
              <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                {canSelect ? <Checkbox aria-label={`Select ${titleOf(page)}`} checked={selected.has(page.id)} onCheckedChange={() => onToggle(page.id)} /> : null}
              </td>
              <td className="max-w-[320px] px-3 py-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(page);
                  }}
                  className="block max-w-full truncate text-left font-medium text-ws-ink"
                >
                  {titleOf(page) || "Untitled"}
                </button>
              </td>
              {columns.map((def) => (
                <td key={`${def.key}-${def.type}`} className="px-3 py-2">
                  <Cell def={def} page={page} />
                </td>
              ))}
              <td className="whitespace-nowrap px-3 py-2 text-[13px] text-ws-ink-3">{formatRelative(page.updatedAt)}</td>
              <td className="px-3 py-2 text-right">
                <span className="ws-label text-[10px] text-ws-ink-3 opacity-0 group-hover/row:opacity-100">Open</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="px-3 py-10 text-center text-[14px] text-ws-ink-3">Nothing matches these filters.</p> : null}
    </div>
  );
};

interface BoardViewProps {
  groups: Record<AtlasStatus, AtlasPage[]>;
  canMove: boolean;
  onOpen: (page: AtlasPage) => void;
  /** Resolves true when the move happened; a failed validation leaves the card where it was. */
  onMove: (page: AtlasPage, to: AtlasStatus) => void;
  typeColumn?: AtlasPropertyDef;
}

export const BoardView = ({ groups, canMove, onOpen, onMove, typeColumn }: BoardViewProps) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<AtlasStatus | null>(null);
  const all = Object.values(groups).flat();

  const drop = (event: DragEvent, status: AtlasStatus) => {
    event.preventDefault();
    setOver(null);
    const page = all.find((candidate) => candidate.id === dragId);
    setDragId(null);
    if (page && page.status !== status) onMove(page, status);
  };

  return (
    <div className="grid min-w-[720px] grid-cols-3 gap-4 p-4">
      {STATUS_ORDER.map((status) => (
        <section
          key={status}
          aria-label={`${STATUS_LABEL[status]} pages`}
          onDragOver={(event) => {
            if (canMove && dragId) {
              event.preventDefault();
              setOver(status);
            }
          }}
          onDragLeave={() => setOver((current) => (current === status ? null : current))}
          onDrop={(event) => drop(event, status)}
          className={cn("min-h-[200px] rounded-[8px] border border-transparent bg-ws-side p-2", over === status && "border-ws-accent")}
        >
          <header className="flex items-center gap-2 px-1 pb-2 pt-1">
            <StatusPill status={status} />
            <span className="text-[12px] text-ws-ink-3">{groups[status].length}</span>
          </header>
          <div className="space-y-2">
            {groups[status].map((page) => (
              <article
                key={page.id}
                draggable={canMove}
                onDragStart={() => setDragId(page.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOver(null);
                }}
                onClick={() => onOpen(page)}
                className={cn(
                  "cursor-pointer rounded-[6px] border border-ws-line bg-ws-paper p-3 hover:border-ws-accent",
                  dragId === page.id && "opacity-40",
                )}
              >
                <p className="truncate text-[14px] font-medium text-ws-ink">{titleOf(page) || "Untitled"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {typeColumn ? <Cell def={typeColumn} page={page} /> : null}
                  <span className="text-[12px] text-ws-ink-3">{formatRelative(page.updatedAt)}</span>
                </div>
              </article>
            ))}
            {groups[status].length === 0 ? <p className="px-1 py-4 text-[13px] text-ws-ink-3">None</p> : null}
          </div>
        </section>
      ))}
    </div>
  );
};

interface GalleryViewProps {
  rows: AtlasPage[];
  typeColumn?: AtlasPropertyDef;
  onOpen: (page: AtlasPage) => void;
}

export const GalleryView = ({ rows, typeColumn, onOpen }: GalleryViewProps) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 p-4">
    {rows.map((page) => (
      <button
        key={page.id}
        type="button"
        onClick={() => onOpen(page)}
        className="flex min-h-[170px] flex-col rounded-[8px] border border-ws-line bg-ws-paper p-4 text-left hover:border-ws-accent"
      >
        <p className="line-clamp-4 flex-1 text-[13px] leading-5 text-ws-ink-3">{bodyPreview(page) || "No content yet"}</p>
        <p className="mt-3 truncate text-[15px] font-semibold text-ws-ink">{titleOf(page) || "Untitled"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {typeColumn ? <Cell def={typeColumn} page={page} /> : null}
          <StatusPill status={page.status} />
        </div>
      </button>
    ))}
    {rows.length === 0 ? <p className="col-span-full py-10 text-center text-[14px] text-ws-ink-3">Nothing matches these filters.</p> : null}
  </div>
);
