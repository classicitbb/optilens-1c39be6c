import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { FileText, User, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import { canonicalToTiptapDoc, tiptapDocToCanonical } from "@/lib/wikiCanonical";
import { cn } from "@/lib/utils";
import BlockGutter from "./editor/BlockGutter";
import BubbleToolbar from "./editor/BubbleToolbar";
import TableContextMenu from "./editor/TableContextMenu";
import { SuggestionPopup, useSuggestionBridge } from "./editor/SuggestionPopup";
import { unmergeTableCells } from "./editor/pasteTables";
import {
  buildBaseExtensions,
  createSuggestionExtension,
  mentionKey,
  slashKey,
  type AskIrisRequest,
  type SuggestionBridge,
} from "./editor/extensions";
import { SLASH_GROUPS, filterSlashItems, type SlashItem } from "./editor/slashItems";
import "@/styles/workspace-editor.css";

export interface EditorPage {
  id: string;
  title: string;
  slug?: string | null;
}

export interface EditorPerson {
  id: string;
  name: string;
}

interface MentionItem {
  kind: "page" | "person" | "date";
  label: string;
  id?: string;
  slug?: string;
  hint?: string;
}

interface BlockEditorProps {
  /** Initial document. Remount with a new `key` to load a different one. */
  value: BlogCanonicalContent;
  onChange: (doc: BlogCanonicalContent) => void;
  pages: EditorPage[];
  searchPeople?: (query: string) => Promise<EditorPerson[]>;
  onAskIris?: (request: AskIrisRequest) => void;
  /** Hands the live editor to the page (and null on unmount) so Iris proposals can be applied. */
  onEditor?: (editor: Editor | null) => void;
  className?: string;
}

const formatDate = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const dateOptions = (): MentionItem[] => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  return [
    { kind: "date", label: formatDate(new Date(now)), hint: "Today" },
    { kind: "date", label: formatDate(new Date(now + day)), hint: "Tomorrow" },
    { kind: "date", label: formatDate(new Date(now + 7 * day)), hint: "Next week" },
  ];
};

const BlockEditor = ({ value, onChange, pages, searchPeople, onAskIris, onEditor, className }: BlockEditorProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  // Latest props for callbacks captured once by the editor extensions.
  const latest = useRef({ onChange, onAskIris, pages, searchPeople });
  latest.current = { onChange, onAskIris, pages, searchPeople };
  const blockPageLink = useRef(false);
  // The people lookup is a network call, so mention results can arrive out of order. Only the
  // newest query may decide what the list shows.
  const mentionSeq = useRef(0);
  const mentionLatest = useRef<MentionItem[] | null>(null);

  const slash = useSuggestionBridge<SlashItem>();
  const mention = useSuggestionBridge<MentionItem>();

  const mentionBridge = useMemo<SuggestionBridge<MentionItem>>(
    () => ({
      ...mention.bridge,
      onExit: () => {
        blockPageLink.current = false;
        mention.bridge.onExit();
      },
    }),
    [mention.bridge],
  );

  const askIris = (request: AskIrisRequest) => latest.current.onAskIris?.(request);

  const editor = useEditor({
    extensions: [
      ...buildBaseExtensions({ onAskIris: (request) => latest.current.onAskIris?.(request) }),
      createSuggestionExtension<SlashItem>({
        name: "slashCommand",
        char: "/",
        pluginKey: slashKey,
        getItems: ({ query }) => filterSlashItems(query),
        bridge: slash.bridge,
        run: ({ editor: ed, range, item }) =>
          item.run({
            editor: ed,
            range,
            askIris: (request) => latest.current.onAskIris?.(request),
            openImageDialog: () => setImageOpen(true),
            startPageLink: () => {
              blockPageLink.current = true;
              ed.chain().focus().insertContent("@").run();
            },
          }),
      }),
      createSuggestionExtension<MentionItem>({
        name: "mentionCommand",
        char: "@",
        pluginKey: mentionKey,
        bridge: mentionBridge,
        getItems: async ({ query }) => {
          const mine = ++mentionSeq.current;
          const q = query.trim().toLowerCase();
          const pageItems: MentionItem[] = latest.current.pages
            .filter((page) => !q || page.title.toLowerCase().includes(q))
            .slice(0, 6)
            .map((page) => ({ kind: "page", label: page.title || "Untitled", id: page.id, slug: page.slug ?? undefined, hint: "Page" }));
          let people: MentionItem[] = [];
          if (q && latest.current.searchPeople) {
            try {
              people = (await latest.current.searchPeople(q)).slice(0, 5).map((person) => ({ kind: "person", label: person.name, id: person.id, hint: "Person" }));
            } catch {
              people = [];
            }
          }
          const dates = dateOptions().filter((item) => !q || item.hint?.toLowerCase().includes(q) || item.label.toLowerCase().includes(q));
          const result = [...pageItems, ...people, ...dates];
          if (mine === mentionSeq.current) {
            mentionLatest.current = result;
            return result;
          }
          return mentionLatest.current ?? result;
        },
        run: ({ editor: ed, range, item }) => {
          const asBlock = blockPageLink.current && item.kind === "page" && item.id;
          blockPageLink.current = false;
          if (asBlock) {
            const $from = ed.state.doc.resolve(range.from);
            const start = $from.before();
            const end = $from.after() - (range.to - range.from);
            ed.chain()
              .focus()
              .deleteRange(range)
              .insertContentAt({ from: start, to: end }, [
                { type: "pageLink", attrs: { articleId: item.id, title: item.label, slug: item.slug ?? null } },
                { type: "paragraph" },
              ])
              .run();
            return;
          }
          ed.chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: "mention", attrs: { kind: item.kind, label: item.label, id: item.id ?? null, slug: item.slug ?? null } },
              { type: "text", text: " " },
            ])
            .run();
        },
      }),
    ],
    content: canonicalToTiptapDoc(value),
    onUpdate: ({ editor: ed }) => {
      if (ed.isDestroyed) return;
      latest.current.onChange(tiptapDocToCanonical(ed.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "ws-prose ws-editor focus:outline-none",
        "aria-label": "Page content",
      },
      transformPastedHTML: unmergeTableCells,
      handlePaste(view, event) {
        const images = Array.from(event.clipboardData?.items ?? []).filter((item) => item.type.startsWith("image/"));
        if (images.length === 0) return false;
        images.forEach((item) => {
          const file = item.getAsFile();
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (loaded) => {
            const src = loaded.target?.result as string | undefined;
            const node = src ? view.state.schema.nodes.image?.create({ src, alt: "" }) : null;
            if (node) view.dispatch(view.state.tr.replaceSelectionWith(node));
          };
          reader.readAsDataURL(file);
        });
        return true;
      },
    },
  });

  useEffect(() => {
    onEditor?.(editor);
    return () => onEditor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const insertImage = () => {
    const src = imageUrl.trim();
    if (!src) return;
    editor.chain().focus().insertContent({ type: "image", attrs: { src, alt: imageAlt.trim() || null } }).run();
    setImageOpen(false);
    setImageUrl("");
    setImageAlt("");
  };

  return (
    <div ref={wrapperRef} className={cn("ws-editor-wrap relative", className)}>
      <BlockGutter editor={editor} wrapperRef={wrapperRef} onAskIris={askIris} />
      <BubbleToolbar editor={editor} onAskIris={askIris} />
      <TableContextMenu editor={editor}>
        <EditorContent editor={editor} />
      </TableContextMenu>

      <SuggestionPopup
        state={slash.state}
        selected={slash.selected}
        onHover={slash.setSelected}
        label="Insert a block"
        empty="No matching blocks"
        groupOf={(item) => item.group}
        renderItem={(item) => (
          <>
            <item.icon className="h-4 w-4 shrink-0 text-ws-ink-3" />
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            {item.hint ? <span className="shrink-0 text-[11px] text-ws-ink-3">{item.hint}</span> : null}
          </>
        )}
      />
      <SuggestionPopup
        state={mention.state}
        selected={mention.selected}
        onHover={mention.setSelected}
        label="Mention a page, person or date"
        empty="Nothing to mention yet"
        groupOf={(item) => (item.kind === "page" ? "Pages" : item.kind === "person" ? "People" : "Dates")}
        renderItem={(item) => (
          <>
            {item.kind === "page" ? <FileText className="h-4 w-4 shrink-0 text-ws-ink-3" /> : item.kind === "person" ? <User className="h-4 w-4 shrink-0 text-ws-ink-3" /> : <CalendarDays className="h-4 w-4 shrink-0 text-ws-ink-3" />}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.hint ? <span className="shrink-0 text-[11px] text-ws-ink-3">{item.hint}</span> : null}
          </>
        )}
      />

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>Paste an image address. You can also paste an image straight into the page.</DialogDescription>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              insertImage();
            }}
          >
            <input
              autoFocus
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Image URL"
              aria-label="Image URL"
              className="h-9 w-full border border-ws-input-border bg-ws-paper px-2 text-[14px] outline-none focus:border-ws-accent"
            />
            <input
              value={imageAlt}
              onChange={(event) => setImageAlt(event.target.value)}
              placeholder="Alt text (optional)"
              aria-label="Alt text"
              className="h-9 w-full border border-ws-input-border bg-ws-paper px-2 text-[14px] outline-none focus:border-ws-accent"
            />
            <button type="submit" className="h-9 rounded-[6px] bg-ws-accent px-4 text-[14px] font-semibold text-[hsl(var(--ws-accent-fg))]">
              Insert image
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlockEditor;
