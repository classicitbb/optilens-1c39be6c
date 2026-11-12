import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  CaseSensitive,
  Copy,
  Download,
  Eye,
  History,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  Search,
  Share2,
  Smile,
  Sparkles,
  Star,
  StarOff,
  Trash2,
  Upload,
  Maximize2,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAtlasHost } from "../host";
import type { AtlasPageFont } from "../hooks/useAtlasPrefs";
import { ATLAS_DOC_TYPES } from "../spaces";

const PAGE_FONTS: { id: AtlasPageFont; label: string; family: string }[] = [
  { id: "default", label: "Default", family: "var(--ws-font-sans)" },
  { id: "serif", label: "Serif", family: "var(--ws-font-serif, Georgia, serif)" },
  { id: "mono", label: "Mono", family: "var(--ws-font-mono)" },
];

export const formatRelative = (iso?: string | null): string => {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export interface Crumb {
  label: string;
  to?: string;
}

interface PageTopBarProps {
  crumbs: Crumb[];
  editedAt?: string | null;
  /** Leaves room for the floating "open sidebar" button. */
  insetLeft: boolean;
  editing: boolean;
  dirty: boolean;
  /** "Saving…", "Saved", "Unsaved changes"… */
  saveLabel?: string | null;
  isPublished: boolean;
  isSaving: boolean;
  canPublish: boolean;
  hasPage: boolean;
  /** False for read-only viewers: editing, duplicating and trashing are disabled. */
  canEdit: boolean;
  irisOpen: boolean;
  fullWidth: boolean;
  pageFont: AtlasPageFont;
  smallText: boolean;
  onPageFontChange: (font: AtlasPageFont) => void;
  onToggleSmallText: () => void;
  isFavorite: boolean;
  launcherFavorite?: ReactNode;
  onToggleEdit: () => void;
  onPublish: () => void;
  onShare: () => void;
  onToggleIris: () => void;
  onToggleFullWidth: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  onExportMarkdown: () => void;
  onOpenHistory: () => void;
  onTrash: () => void;
  /** Slug, summary, link target, section, parent, order and password fields, shown from the page actions menu. */
  settings: ReactNode;
}

/** A small on/off switch drawn inside a menu row. */
const MenuSwitch = ({ on }: { on: boolean }) => (
  <span aria-hidden className={cn("ml-auto flex h-[14px] w-[26px] shrink-0 items-center rounded-full p-[2px] transition-colors", on ? "bg-ws-accent" : "bg-ws-ink-3/60")}>
    <span className={cn("h-[10px] w-[10px] rounded-full bg-white transition-transform", on && "translate-x-[12px]")} />
  </span>
);

interface PageAction {
  label: string;
  icon: typeof Copy;
  onSelect: () => void;
  disabled?: boolean;
  title?: string;
  /** Rows with a switch stay open when chosen; the switch shows this state. */
  toggle?: boolean;
  on?: boolean;
  /** Starts a new group (a separator above it). */
  group?: number;
}

const topIconClass = "flex h-7 w-7 items-center justify-center rounded-[6px] text-ws-ink hover:bg-[var(--ws-hover)] disabled:opacity-40";

export const PageTopBar = (props: PageTopBarProps) => {
  const { crumbs, editedAt, insetLeft, editing, dirty, isSaving, canPublish, canEdit, hasPage, irisOpen, fullWidth, isFavorite } = props;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [actionQuery, setActionQuery] = useState("");

  const actions: PageAction[] = [
    {
      label: "Page settings",
      icon: Settings2,
      onSelect: () => setSettingsOpen(true),
      disabled: !canEdit || !editing,
      title: canEdit && !editing ? "Switch to Edit to change page settings" : undefined,
      group: 0,
    },
    { label: isFavorite ? "Remove from favorites" : "Add to favorites", icon: isFavorite ? StarOff : Star, onSelect: props.onToggleFavorite, group: 0 },
    { label: "Duplicate", icon: Copy, onSelect: props.onDuplicate, disabled: !canEdit, group: 0 },
    { label: "Export Markdown", icon: Download, onSelect: props.onExportMarkdown, group: 0 },
    { label: "Page history", icon: History, onSelect: props.onOpenHistory, group: 0 },
    { label: "Small text", icon: CaseSensitive, onSelect: props.onToggleSmallText, toggle: true, on: props.smallText, group: 1 },
    { label: "Full width", icon: Maximize2, onSelect: props.onToggleFullWidth, toggle: true, on: fullWidth, group: 1 },
    { label: "Move to trash", icon: Trash2, onSelect: props.onTrash, disabled: !canEdit, group: 2 },
  ];
  const query = actionQuery.trim().toLowerCase();
  const shown = query ? actions.filter((action) => action.label.toLowerCase().includes(query)) : actions;

  return (
    <div className={cn("sticky top-0 z-10 flex h-[45px] items-center gap-1 bg-ws-bg px-3", insetLeft && "pl-12")}>
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-0.5 text-[14px] text-ws-ink">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-0.5">
            {index > 0 ? <span className="shrink-0 px-0.5 text-ws-ink-3">/</span> : null}
            {crumb.to ? (
              <Link to={crumb.to} className="truncate rounded-[6px] px-1.5 py-0.5 hover:bg-[var(--ws-hover)]">
                {crumb.label}
              </Link>
            ) : (
              <span className="truncate px-1.5 py-0.5">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {hasPage && props.saveLabel ? (
        <span role="status" className="shrink-0 px-1 text-[14px] text-ws-ink-3">
          {props.saveLabel}
        </span>
      ) : hasPage && editedAt ? (
        <span className="hidden shrink-0 px-1 text-[14px] text-ws-ink-3 lg:inline">Edited {formatRelative(editedAt)}</span>
      ) : null}

      <button
        type="button"
        onClick={props.onShare}
        disabled={!hasPage}
        className="hidden h-7 items-center gap-1.5 rounded-[6px] px-2 text-[14px] font-medium text-ws-ink hover:bg-[var(--ws-hover)] disabled:opacity-40 sm:flex"
      >
        <Share2 className="h-4 w-4" strokeWidth={1.75} /> Share
      </button>
      <button
        type="button"
        onClick={props.onToggleIris}
        aria-pressed={irisOpen}
        aria-label="Toggle Iris panel"
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[14px] font-medium hover:bg-[var(--ws-hover)]",
          irisOpen ? "bg-ws-accent-tint text-ws-accent" : "text-ws-ink",
        )}
      >
        <Sparkles className="h-4 w-4" strokeWidth={1.75} /> <span className="hidden sm:inline">Iris</span>
      </button>

      <button
        type="button"
        onClick={props.onToggleEdit}
        disabled={!hasPage || !canEdit}
        title={canEdit ? undefined : "You have read-only access here"}
        className="flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[14px] font-medium text-ws-ink hover:bg-[var(--ws-hover)] disabled:opacity-40"
      >
        {editing ? <Eye className="h-4 w-4" strokeWidth={1.75} /> : <Pencil className="h-4 w-4" strokeWidth={1.75} />}
        <span className="hidden sm:inline">{editing ? "Preview" : "Edit"}</span>
      </button>

      <button
        type="button"
        onClick={props.onToggleFavorite}
        disabled={!hasPage}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        className={cn(topIconClass, "max-sm:hidden")}
      >
        <Star className={cn("h-[18px] w-[18px]", isFavorite && "fill-[hsl(var(--ws-c-yellow))] text-[hsl(var(--ws-c-yellow))]")} strokeWidth={1.75} />
      </button>

      <DropdownMenu onOpenChange={(open) => !open && setActionQuery("")}>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Page actions" disabled={!hasPage} className={cn(topIconClass, "data-[state=open]:bg-[var(--ws-hover)]")}>
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[265px] p-1.5">
          <div className="flex h-8 items-center gap-2 rounded-[6px] border border-ws-line bg-[var(--ws-hover)] px-2 text-ws-ink-3">
            <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <input
              value={actionQuery}
              onChange={(event) => setActionQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Search actions…"
              aria-label="Search actions"
              className="ws-bare-input h-full min-w-0 flex-1 bg-transparent text-[14px] text-ws-ink outline-none placeholder:text-ws-ink-3"
            />
          </div>
          {!query ? (
            <div className="px-1 pb-1 pt-2">
              <p className="px-1 pb-1.5 text-[12px] font-medium text-ws-ink-3">Font style</p>
              <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Font style">
                {PAGE_FONTS.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    role="radio"
                    aria-checked={props.pageFont === font.id}
                    onClick={() => props.onPageFontChange(font.id)}
                    className={cn(
                      "flex h-[58px] flex-col items-center justify-center rounded-[6px] hover:bg-[var(--ws-hover)]",
                      props.pageFont === font.id ? "bg-[var(--ws-hover)] text-ws-accent" : "text-ws-ink",
                    )}
                  >
                    <span className="text-[24px] leading-none" style={{ fontFamily: font.family }}>
                      Ag
                    </span>
                    <span className="mt-1 text-[12px] text-ws-ink-3">{font.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {shown.map((action, index) => (
            <div key={action.label}>
              {index > 0 && action.group !== shown[index - 1].group ? <DropdownMenuSeparator /> : index === 0 ? <div className="h-1" /> : null}
              <DropdownMenuItem
                disabled={action.disabled}
                title={action.title}
                onSelect={(event) => {
                  if (action.toggle) event.preventDefault();
                  action.onSelect();
                }}
                className="gap-2"
              >
                <action.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1 truncate">{action.label}</span>
                {action.toggle ? <MenuSwitch on={Boolean(action.on)} /> : null}
              </DropdownMenuItem>
            </div>
          ))}
          {query && shown.length === 0 ? <p className="px-2 py-2 text-[13px] text-ws-ink-3">No actions match.</p> : null}
          {!query && props.launcherFavorite ? (
            <>
              <DropdownMenuSeparator />
              {props.launcherFavorite}
            </>
          ) : null}
          <DropdownMenuSeparator />
          <div className="px-2 pb-1 pt-0.5 text-[12px] leading-[1.6] text-ws-ink-3">
            <p>Last edited</p>
            <p>{editedAt ? new Date(editedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not saved yet"}</p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={props.onPublish}
        disabled={!hasPage || isSaving || !canPublish}
        title={canPublish ? undefined : "You do not have permission to publish here"}
        className="ml-1 flex h-7 items-center gap-1.5 rounded-[6px] bg-ws-accent px-2.5 text-[14px] font-medium text-[hsl(var(--ws-accent-fg))] hover:opacity-90 disabled:opacity-40"
      >
        <Upload className="h-4 w-4" strokeWidth={1.75} /> {props.isPublished ? "Update" : "Publish"}
      </button>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] w-[28rem] max-w-[calc(100vw-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Page settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">{props.settings}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EMOJI = ["📄", "📘", "📋", "✅", "🛠️", "📦", "🚚", "💳", "🧾", "🧩", "🔬", "📐", "📊", "🧭", "🔒", "💡", "⚠️", "📞", "🗂️", "🏷️"];

const Cover = () => (
  <div className="relative h-36 w-full overflow-hidden bg-ws-navy" aria-hidden>
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 144" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1">
        {[28, 52, 80, 112, 148, 188, 232].map((radius) => (
          <circle key={radius} cx="620" cy="72" r={radius} />
        ))}
      </g>
      <g fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1">
        {[40, 90, 160].map((radius) => (
          <circle key={radius} cx="180" cy="130" r={radius} />
        ))}
      </g>
    </svg>
    <span className="absolute bottom-0 left-0 h-[3px] w-24 bg-[hsl(var(--ws-accent-line))]" />
  </div>
);

export interface IdentityProps {
  icon?: string;
  cover: boolean;
  title: string;
  editable: boolean;
  fullWidth: boolean;
  status: "draft" | "published" | "archived";
  kind: "article" | "link";
  ownerName: string | null;
  contextSlugs: string[];
  updatedAt?: string | null;
  versionNumber?: number;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | undefined) => void;
  onToggleCover: () => void;
  onStatusChange: (status: "draft" | "archived") => void;
  onContextsChange: (slugs: string[]) => void;
  /** Doc / Wiki / SOP; the row is hidden when the space or storage has no type. */
  docType?: string;
  onDocTypeChange?: (type: string) => void;
}

const PropertyRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-h-[34px] items-center gap-2" data-property={label.toLowerCase()}>
    <span className="w-[160px] shrink-0 px-1.5 text-[14px] text-ws-ink-3 max-sm:w-[110px]">{label}</span>
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[14px] text-ws-ink-2">{children}</div>
  </div>
);

export const PageIdentity = (props: IdentityProps) => {
  const { icon, cover, title, editable, fullWidth, status } = props;
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  return (
    <div>
      {cover ? <Cover /> : null}
      <div className={cn("mx-auto w-full px-6 sm:px-24", fullWidth ? "max-w-none" : "max-w-[900px]")}>
        <div className={cn("group/ident relative", cover ? "-mt-7" : "pt-8")}>
          {icon ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Change icon" className="mb-2 flex h-14 w-14 items-center justify-center rounded-[8px] bg-ws-paper text-[40px] leading-none shadow-sm hover:bg-[var(--ws-hover)]">
                  {icon}
                </button>
              </PopoverTrigger>
              <EmojiPicker onPick={props.onIconChange} onClear={() => props.onIconChange(undefined)} />
            </Popover>
          ) : null}

          {editable ? (
            <div className="mb-1 flex h-7 gap-1 text-[13px] text-ws-ink-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover/ident:opacity-100">
              {!icon ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="flex items-center gap-1.5 rounded-[4px] px-1.5 hover:bg-[var(--ws-hover)]">
                      <Smile className="h-3.5 w-3.5" /> Add icon
                    </button>
                  </PopoverTrigger>
                  <EmojiPicker onPick={props.onIconChange} onClear={() => props.onIconChange(undefined)} />
                </Popover>
              ) : null}
              <button type="button" onClick={props.onToggleCover} className="flex items-center gap-1.5 rounded-[4px] px-1.5 hover:bg-[var(--ws-hover)]">
                <ImagePlus className="h-3.5 w-3.5" /> {cover ? "Remove cover" : "Add cover"}
              </button>
            </div>
          ) : null}

          <textarea
            ref={titleRef}
            value={title}
            rows={1}
            readOnly={!editable}
            aria-label="Page title"
            placeholder="Untitled"
            onChange={(event) => props.onTitleChange(event.target.value.replace(/\n/g, " "))}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            className="ws-page-title ws-bare-input block w-full resize-none overflow-hidden bg-transparent text-ws-ink outline-none placeholder:text-ws-ink-3"
          />
        </div>

        <div className="mt-3 flex flex-col pb-4" aria-label="Page properties">
          <PropertyRow label="Status">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={!editable}
                  className={cn(
                    "rounded-[4px] px-2 py-0.5 text-[13px] font-medium capitalize",
                    status === "published" && "ws-bg-green ws-color-green",
                    status === "draft" && "ws-bg-gray ws-color-gray",
                    status === "archived" && "ws-bg-red ws-color-red",
                  )}
                >
                  {props.kind === "link" ? "Link" : status}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onSelect={() => props.onStatusChange("draft")}>
                  {status === "published" ? "Move to draft" : "Draft"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => props.onStatusChange("archived")}>Archived</DropdownMenuItem>
                <p className="px-2 py-1.5 text-[12px] text-ws-ink-3">Use Publish to make a page live.</p>
              </DropdownMenuContent>
            </DropdownMenu>
          </PropertyRow>

          {props.docType !== undefined ? (
            <PropertyRow label="Type">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={!editable}
                    className={cn(
                      "rounded-[4px] px-2 py-0.5 text-[13px] font-medium",
                      props.docType === "sop" ? "ws-bg-orange ws-color-orange" : props.docType === "wiki" ? "ws-bg-blue ws-color-blue" : "ws-bg-gray ws-color-gray",
                    )}
                  >
                    {ATLAS_DOC_TYPES.find((type) => type.value === props.docType)?.label ?? "Doc"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {ATLAS_DOC_TYPES.map((type) => (
                    <DropdownMenuItem key={type.value} onSelect={() => props.onDocTypeChange?.(type.value)} className="flex-col items-start gap-0">
                      <span className="text-[14px] text-ws-ink">{type.label}</span>
                      <span className="text-[12px] text-ws-ink-3">{type.help}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </PropertyRow>
          ) : null}

          <PropertyRow label="Owner">{props.ownerName ?? <span className="text-ws-ink-3">Unassigned</span>}</PropertyRow>

          <PropertyRow label="Contexts">
            {props.contextSlugs.length === 0 ? <span className="text-ws-ink-3">None</span> : null}
            {props.contextSlugs.map((slug) => (
              <span key={slug} className="rounded-[4px] bg-ws-side-hover px-2 py-0.5 text-[13px]">
                {(getAtlasHost().contextOptions ?? []).find((option) => option.value === slug)?.label ?? slug}
              </span>
            ))}
            {editable ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="rounded-[4px] px-1.5 py-0.5 text-[13px] text-ws-ink-3 hover:bg-[var(--ws-hover)]">
                    Edit
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="max-h-80 w-72 overflow-y-auto p-2">
                  {(getAtlasHost().contextOptions ?? []).map((option) => {
                    const checked = props.contextSlugs.includes(option.value);
                    return (
                      <label key={option.value} className="flex cursor-pointer items-start gap-2 rounded-[4px] px-2 py-1.5 hover:bg-[var(--ws-hover)]">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            props.onContextsChange(
                              next
                                ? [...new Set([...props.contextSlugs, option.value])]
                                : props.contextSlugs.filter((value) => value !== option.value),
                            )
                          }
                        />
                        <span>
                          <span className="block text-[14px] text-ws-ink">{option.label}</span>
                          <span className="block text-[12px] text-ws-ink-3">{option.path}</span>
                        </span>
                      </label>
                    );
                  })}
                </PopoverContent>
              </Popover>
            ) : null}
          </PropertyRow>

          <PropertyRow label="Updated">
            {props.updatedAt ? formatRelative(props.updatedAt) : "Not saved yet"}
            {props.versionNumber ? <span className="ws-mono text-[12px] text-ws-ink-3">· v{props.versionNumber}</span> : null}
          </PropertyRow>

        </div>
        <div className="border-b border-ws-line" />
      </div>
    </div>
  );
};

const EmojiPicker = ({ onPick, onClear }: { onPick: (emoji: string) => void; onClear: () => void }) => (
  <PopoverContent align="start" className="w-64 p-2">
    <div className="grid grid-cols-5 gap-1">
      {EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="flex h-9 items-center justify-center rounded-[4px] text-[20px] hover:bg-[var(--ws-hover)]"
        >
          {emoji}
        </button>
      ))}
    </div>
    <button type="button" onClick={onClear} className="mt-2 flex w-full items-center gap-1.5 rounded-[4px] px-2 py-1 text-[13px] text-ws-ink-3 hover:bg-[var(--ws-hover)]">
      <Trash2 className="h-3.5 w-3.5" /> Remove icon
    </button>
  </PopoverContent>
);
