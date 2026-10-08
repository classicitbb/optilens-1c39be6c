import type { Editor } from "@tiptap/core";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import BlockEditor, { type EditorPage, type EditorPerson } from "./BlockEditor";
import PageLockGate from "./PageLockGate";
import type { AskIrisRequest } from "./editor/extensions";
import { unlockPage, usePageUnlocked } from "../lock";
import type { usePageEditor } from "../hooks/usePageEditor";
import type { AtlasPage } from "../source/types";

interface PageBodyProps {
  page: AtlasPage;
  editor: ReturnType<typeof usePageEditor>;
  editing: boolean;
  canPublish: boolean;
  supportsDrafts: boolean;
  pages: EditorPage[];
  searchPeople: (query: string) => Promise<EditorPerson[]>;
  resolvePageHref: (page: { id?: string; slug?: string; title: string }) => string | undefined;
  onAskIris: (request?: AskIrisRequest) => void;
  onUpdate: () => void;
  onEditor?: (editor: Editor | null) => void;
}

/** The body of one page, shared by the full page and the database peek: banners plus editor or reader. */
const PageBody = ({ page, editor, editing, canPublish, supportsDrafts, pages, searchPeople, resolvePageHref, onAskIris, onUpdate, onEditor }: PageBodyProps) => {
  const { draft, setDraft } = editor;
  const lock = draft.doc.lock;
  const unlocked = usePageUnlocked(page.id, lock);
  if (lock && !unlocked) return <PageLockGate lock={lock} onUnlock={() => unlockPage(page.id, lock)} />;
  return (
    <>
      {editor.hasUnpublishedDraft ? (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-[4px] border border-ws-line bg-ws-accent-tint px-3 py-2 text-[14px]">
          <span className="flex-1">This page has unpublished changes. Visitors still see the published version.</span>
          <button
            type="button"
            onClick={onUpdate}
            disabled={editor.isSaving || !canPublish}
            className="rounded-[6px] bg-ws-accent px-3 py-1 text-[13px] font-semibold text-[hsl(var(--ws-accent-fg))] disabled:opacity-40"
          >
            Update
          </button>
          <button type="button" onClick={() => void editor.discardUnpublished()} className="rounded-[6px] px-3 py-1 text-[13px] hover:bg-[var(--ws-hover)]">
            Discard changes
          </button>
        </div>
      ) : null}
      {editor.isPublished && !supportsDrafts && editor.bodyChanged ? (
        <div role="status" className="mb-4 rounded-[4px] border border-ws-line bg-ws-side px-3 py-2 text-[13px] text-ws-ink-2">
          Edits to a published page stay in this browser until you choose Update. Saving them as a draft needs the draft-copy migration on this project.
        </div>
      ) : null}
      {draft.entryKind === "link" ? (
        <div className="space-y-2 border border-ws-line bg-ws-paper p-4">
          <p className="ws-label text-ws-ink-3">Linked page</p>
          <p className="break-all text-[14px] text-ws-ink-2">{draft.href || "Add a link target in Page settings."}</p>
        </div>
      ) : editing ? (
        <BlockEditor
          key={`${page.id}:${editor.editorEpoch}`}
          value={draft.doc}
          // The editor only knows blocks; preserve document-level lock and layout settings.
          onChange={(doc) => setDraft((current) => ({ ...current, doc: { ...doc, ...(current.doc.lock ? { lock: current.doc.lock } : {}), ...(current.doc.layout ? { layout: current.doc.layout } : {}) } }))}
          pages={pages}
          searchPeople={searchPeople}
          onAskIris={onAskIris}
          onEditor={onEditor}
        />
      ) : (
        <WikiArticleRenderer
          bodyJson={draft.doc}
          className="ws-prose mx-auto"
          resolvePageHref={resolvePageHref}
          emptyMessage="This page is empty. Choose Edit to start writing."
        />
      )}
    </>
  );
};

export default PageBody;
