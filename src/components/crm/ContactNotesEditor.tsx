import { useCallback, useMemo, useState, type MouseEvent } from "react";
import type { Editor } from "@tiptap/core";
import BlockEditor from "@/features/atlas/components/BlockEditor";
import { atlasPath } from "@/features/atlas/config";
import { useAtlasData } from "@/features/atlas/hooks/useAtlas";
import { toPageSlug } from "@/features/atlas/pageTree";
import { listAtlasSpaces, pageInSpace } from "@/features/atlas/spaces";
import type { AtlasPage } from "@/features/atlas/source/types";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import { canonicalToSearchText, toCanonicalDocument } from "@/lib/wikiCanonical";

interface ContactNotesEditorProps {
  /** Plain-text notes; loaded as the document when the contact has no `notesDoc` yet. */
  notes: string;
  notesDoc?: BlogCanonicalContent | null;
  /** Receives the edited document and its plain-text mirror (what `notes` stores). */
  onChange: (doc: BlogCanonicalContent, text: string) => void;
  onEditor?: (editor: Editor | null) => void;
}

const pageHref = (page: AtlasPage) => atlasPath(listAtlasSpaces().find((space) => pageInSpace(space, page))?.id ?? "wiki", toPageSlug(page));

/** The Atlas block editor for one contact's notes. Remount with a new `key` to load another contact. */
const ContactNotesEditor = ({ notes, notesDoc, onChange, onEditor }: ContactNotesEditorProps) => {
  const [initial] = useState(() => toCanonicalDocument(notesDoc ?? notes));
  const { pages: allPages } = useAtlasData();
  const pages = useMemo(() => allPages.filter((page) => page.status !== "archived"), [allPages]);
  const editorPages = useMemo(() => pages.map((page) => ({ id: page.id, title: page.title, slug: page.slug })), [pages]);

  const openPageMention = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const id = (event.target as HTMLElement).closest<HTMLElement>('[data-mention="page"]')?.dataset.mentionId;
      const page = id ? pages.find((candidate) => candidate.id === id) : undefined;
      if (page) window.open(pageHref(page), "_blank", "noopener");
    },
    [pages],
  );

  return (
    <div
      className="rounded-md border bg-[hsl(var(--ws-paper,var(--background)))] px-4 py-3 [&_.ws-editor]:min-h-[280px] [&_.ws-editor]:pb-16 [&_.ws-mention]:cursor-pointer"
      style={{ borderColor: "hsl(var(--border))" }}
      onClick={openPageMention}
    >
      <BlockEditor
        value={initial}
        onChange={(doc) => onChange(doc, canonicalToSearchText(doc))}
        pages={editorPages}
        onEditor={onEditor}
      />
    </div>
  );
};

export default ContactNotesEditor;
