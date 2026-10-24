import { useEffect } from "react";
import { ExternalLink, MoreHorizontal, Sparkles, Trash2, Upload, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getAtlasHost } from "../host";
import type { AtlasCapabilities } from "../capabilities";
import type { EditorPage, EditorPerson } from "../components/BlockEditor";
import PageBody from "../components/PageBody";
import PropertiesForm from "../components/PropertiesForm";
import { usePageEditor } from "../hooks/usePageEditor";
import type { useAtlasData } from "../hooks/useAtlas";
import type { AtlasOption, AtlasSpaceDef } from "../spaces";
import type { AtlasPage } from "../source/types";
import { StatusPill } from "./DatabaseViews";

interface PagePeekProps {
  page: AtlasPage;
  /** Every page of the space, for unique-slug checks and link pickers. */
  pages: AtlasPage[];
  space: AtlasSpaceDef;
  data: ReturnType<typeof useAtlasData>;
  capabilities: AtlasCapabilities;
  dynamicOptions: Record<string, AtlasOption[]>;
  editorPages: EditorPage[];
  searchPeople: (query: string) => Promise<EditorPerson[]>;
  resolvePageHref: (page: { id?: string; slug?: string; title: string }) => string | undefined;
  routeSlug: string;
  onClose: () => void;
  onOpenFull: () => void;
  onAskIris: () => void;
  onSlugChanged: (slug: string) => void;
  onSlugChanging?: (slug: string) => void;
  onStatus: (status: "draft" | "archived") => void;
  onRemove: () => void;
}

/**
 * Right-hand drawer (560px) that edits a page with the same editor session, validators and write
 * path as the full page. A published page's peek edits the draft copy, never the live row.
 */
const PagePeek = ({
  page,
  pages,
  space,
  data,
  capabilities,
  dynamicOptions,
  editorPages,
  searchPeople,
  resolvePageHref,
  routeSlug,
  onClose,
  onOpenFull,
  onAskIris,
  onSlugChanged,
  onSlugChanging,
  onStatus,
  onRemove,
}: PagePeekProps) => {
  const editor = usePageEditor({
    page,
    pages,
    data,
    canEdit: capabilities.edit,
    canPublish: capabilities.publish,
    routeSlug,
    initialMode: capabilities.edit ? "edit" : "view",
    onSlugChanged,
    onSlugChanging,
    onSaved: (slug) => void onSlugChanged(slug),
  });
  const { draft, setDraft } = editor;
  const LauncherFavorite = getAtlasHost().LauncherFavorite;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !(event.target instanceof HTMLElement && event.target.closest("[role='dialog'],[role='menu'],[role='listbox']"))) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      aria-label="Page peek"
      className="fixed inset-y-0 right-0 z-40 flex w-[min(560px,100vw)] flex-col border-l border-ws-line bg-ws-paper shadow-[-8px_0_24px_rgba(0,0,0,0.12)]"
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-ws-line px-3">
        <button type="button" onClick={onOpenFull} className="flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]">
          <ExternalLink className="h-3.5 w-3.5" /> Open as full page
        </button>
        <span role="status" className="ml-auto mr-1 text-[13px] text-ws-ink-3">
          {editor.saveLabel}
        </span>
        <button type="button" onClick={onAskIris} className="flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[14px] text-ws-ink-2 hover:bg-[var(--ws-hover)]">
          <Sparkles className="h-3.5 w-3.5" /> Iris
        </button>
        {capabilities.edit || LauncherFavorite ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Page actions" className="flex h-8 w-8 items-center justify-center rounded-[6px] text-ws-ink-2 hover:bg-[var(--ws-hover)]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {LauncherFavorite ? <LauncherFavorite page={page} /> : null}
              {capabilities.edit && page.status !== "draft" ? <DropdownMenuItem onSelect={() => onStatus("draft")}>Move to draft</DropdownMenuItem> : null}
              {capabilities.edit && page.status !== "archived" ? <DropdownMenuItem onSelect={() => onStatus("archived")}>Archive</DropdownMenuItem> : null}
              {capabilities.remove ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onRemove}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete permanently
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <button
          type="button"
          onClick={() => void editor.saveAs("published")}
          disabled={editor.isSaving || !capabilities.publish}
          title={capabilities.publish ? undefined : "You do not have permission to publish here"}
          className="flex h-8 items-center gap-1.5 rounded-[6px] bg-ws-accent px-3 text-[14px] font-semibold text-[hsl(var(--ws-accent-fg))] hover:opacity-90 disabled:opacity-40"
        >
          <Upload className="h-3.5 w-3.5" /> {page.status === "published" ? "Update" : "Publish"}
        </button>
        <button type="button" aria-label="Close peek" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-ws-ink-3 hover:bg-[var(--ws-hover)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-24 pt-6">
        <textarea
          value={draft.title}
          rows={1}
          readOnly={!capabilities.edit}
          aria-label="Page title"
          placeholder="Untitled"
          onChange={(event) => {
            const title = event.target.value.replace(/\n/g, " ");
            setDraft((current) => ({
              ...current,
              title,
            }));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          className="ws-page-title ws-bare-input block w-full resize-none overflow-hidden bg-transparent text-ws-ink outline-none placeholder:text-ws-ink-3"
        />
        <div className="mt-2 flex items-center gap-2">
          <StatusPill status={page.status} />
          {editor.hasUnpublishedDraft ? <span className="text-[12px] text-ws-ink-3">Unpublished changes</span> : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PropertiesForm
            properties={space.properties}
            draft={draft}
            onChange={setDraft}
            published={editor.isPublished}
            disabled={!capabilities.edit}
            dynamicOptions={dynamicOptions}
          />
        </div>

        <div className="my-6 border-b border-ws-line" />
        <PageBody
          page={page}
          editor={editor}
          editing={editor.mode === "edit" && capabilities.edit}
          canPublish={capabilities.publish}
          supportsDrafts={data.supportsDrafts}
          pages={editorPages.filter((candidate) => candidate.id !== page.id)}
          searchPeople={searchPeople}
          resolvePageHref={resolvePageHref}
          onAskIris={onAskIris}
          onUpdate={() => void editor.saveAs("published")}
        />
      </div>
    </aside>
  );
};

export default PagePeek;
