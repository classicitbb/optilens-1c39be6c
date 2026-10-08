import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router";
import {
  ChevronRight,
  Copy,
  Download,
  Eye,
  History,
  ImagePlus,
  MoreHorizontal,
  Pencil,
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
import { getAtlasHost } from "../host";

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
}

export const PageTopBar = (props: PageTopBarProps) => {
  const { crumbs, editedAt, insetLeft, editing, dirty, isSaving, canPublish, canEdit, hasPage, irisOpen, fullWidth, isFavorite } = props;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex h-11 items-center gap-2 border-b border-transparent bg-ws-bg/90 px-4 backdrop-blur",
        insetLeft && "pl-12",
      )}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-[14px] text-ws-ink-2">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ws-ink-3" /> : null}
            {crumb.to ? (
              <Link to={crumb.to} className="truncate rounded-[4px] px-1 hover:bg-[var(--ws-hover)]">
                {crumb.label}
              </Link>
            ) : (
              <span className={cn("truncate px-1", index === crumbs.length - 1 && "font-medium text-ws-ink")}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {hasPage && props.saveLabel ? (
        <span role="status" className="shrink-0 text-[13px] text-ws-ink-3">
          {props.saveLabel}
        </span>
      ) : hasPage && editedAt ? (
        <span className="hidden shrink-0 text-[13px] text-ws-ink-3 lg:inline">Edited {formatRelative(editedAt)}</span>
      ) : null}

      <button
        type="button"
        onClick={props.onShare}
        disabled={!hasPage}
        className="hidden h-8 items-center gap-1.5 rounded-[6px] px-2 text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)] disabled:opacity-40 sm:flex"
      >
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
      <button
        type="button"
        onClick={props.onToggleIris}
        aria-pressed={irisOpen}
        aria-label="Toggle Iris panel"
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[14px] hover:bg-[var(--ws-hover)]",
          irisOpen ? "bg-ws-accent-tint text-ws-accent" : "text-ws-ink-2",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Iris</span>
      </button>

      <button
        type="button"
        onClick={props.onToggleEdit}
        disabled={!hasPage || !canEdit}
        title={canEdit ? undefined : "You have read-only access here"}
        className="flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)] disabled:opacity-40"
      >
        {editing ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{editing ? "Preview" : "Edit"}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Page actions"
            disabled={!hasPage}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-ws-ink-2 hover:bg-[var(--ws-hover)] disabled:opacity-40"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={props.onToggleFullWidth}>
            <Maximize2 className="mr-2 h-3.5 w-3.5" /> {fullWidth ? "Standard width" : "Full width"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onToggleFavorite}>
            {isFavorite ? <StarOff className="mr-2 h-3.5 w-3.5" /> : <Star className="mr-2 h-3.5 w-3.5" />}
            {isFavorite ? "Remove from favorites" : "Add to favorites"}
          </DropdownMenuItem>
          {props.launcherFavorite}
          <DropdownMenuItem disabled={!canEdit} onSelect={props.onDuplicate}>
            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onExportMarkdown}>
            <Download className="mr-2 h-3.5 w-3.5" /> Export Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onOpenHistory}>
            <History className="mr-2 h-3.5 w-3.5" /> Page history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!canEdit} onSelect={props.onTrash}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={props.onPublish}
        disabled={!hasPage || isSaving || !canPublish}
        title={canPublish ? undefined : "You do not have permission to publish here"}
        className="flex h-8 items-center gap-1.5 rounded-[6px] bg-ws-accent px-3 text-[14px] font-semibold text-[hsl(var(--ws-accent-fg))] hover:opacity-90 disabled:opacity-40"
      >
        <Upload className="h-3.5 w-3.5" /> {props.isPublished ? "Update" : "Publish"}
      </button>
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
  /** Slug, summary, link target, section, parent and order fields. */
  settings: ReactNode;
}

const PropertyRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-h-7 items-center gap-3">
    <span className="ws-label w-20 shrink-0 text-ws-ink-3">{label}</span>
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[14px] text-ws-ink-2">{children}</div>
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
      <div className={cn("mx-auto w-full px-6 sm:px-12", fullWidth ? "max-w-none" : "max-w-[720px]")}>
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

        <div className="mt-3 space-y-0.5 pb-4">
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

          {editable ? (
            <PropertyRow label="More">
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-[13px] text-ws-ink-3 hover:bg-[var(--ws-hover)]">
                    <Settings2 className="h-3.5 w-3.5" /> Page settings
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="max-h-[70vh] w-80 space-y-3 overflow-y-auto p-3">
                  {props.settings}
                </PopoverContent>
              </Popover>
            </PropertyRow>
          ) : null}
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
