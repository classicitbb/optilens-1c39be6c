import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mark, Node, mergeAttributes, type Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, ChevronDown, Code, Italic, Link as LinkIcon, Palette, SpellCheck, Strikethrough, Underline, Undo2 } from "lucide-react";
import InlineDictationButton from "@/components/admin/InlineDictationButton";
import { cn } from "@/lib/utils";
import { tidyDoc } from "./emailTidy";
import "./email-editor.css";

const DICTATION_VOCABULARY = "Classic Visions, OptiLens, Innovations, Rx, lens, coating, invoice, statement, pricelist, order";

// Inline colour (mail clients ignore classes, so this is a style attribute).
const TextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) => (attributes.color ? { style: `color:${attributes.color}` } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[style]", getAttrs: (element) => ((element as HTMLElement).style.color ? null : false) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

// Images by URL (signature logos). Pasted file data is not uploaded anywhere.
const EmailImage = Node.create({
  name: "image",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: null }, width: { default: null }, height: { default: null }, style: { default: null } };
  },
  parseHTML() {
    return [{ tag: "img[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
});

const COLOURS: { name: string; value: string | null }[] = [
  { name: "Default", value: null },
  { name: "Navy", value: "#16263c" },
  { name: "Teal", value: "#1b8c9d" },
  { name: "Red", value: "#c0392b" },
  { name: "Orange", value: "#d35400" },
  { name: "Green", value: "#2e7d32" },
  { name: "Grey", value: "#6b6b6b" },
];

const TURN_INTO: { label: string; run: (editor: Editor) => void; active: (editor: Editor) => boolean }[] = [
  { label: "Text", run: (e) => e.chain().focus().clearNodes().run(), active: (e) => e.isActive("paragraph") && !e.isActive("bulletList") && !e.isActive("orderedList") && !e.isActive("blockquote") },
  { label: "Heading 1", run: (e) => e.chain().focus().clearNodes().setHeading({ level: 1 }).run(), active: (e) => e.isActive("heading", { level: 1 }) },
  { label: "Heading 2", run: (e) => e.chain().focus().clearNodes().setHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
  { label: "Heading 3", run: (e) => e.chain().focus().clearNodes().setHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
  { label: "Bulleted list", run: (e) => e.chain().focus().clearNodes().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
  { label: "Numbered list", run: (e) => e.chain().focus().clearNodes().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
  { label: "Quote", run: (e) => e.chain().focus().clearNodes().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
];

// Same look and behaviour as Atlas's selection toolbar (atlas/components/editor/BubbleToolbar).
const Tool = ({ active, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={cn(
      "flex h-7 min-w-7 items-center justify-center gap-1 whitespace-nowrap rounded-[4px] px-1.5 text-[13px] text-ws-ink-2 hover:bg-[var(--ws-hover)]",
      active && "bg-ws-accent-tint text-ws-accent",
    )}
  >
    {children}
  </button>
);

const Divider = () => <span className="mx-0.5 h-5 w-px bg-ws-line" aria-hidden />;

type Panel = "turn" | "colour" | "link" | null;

// Module constants: BubbleMenu re-registers its plugin whenever these change identity.
const BUBBLE_OPTIONS: BubbleMenuProps["options"] = { placement: "top", offset: 8 };
const showBubble: BubbleMenuProps["shouldShow"] = ({ editor, state }) => {
  const { from, to, empty } = state.selection;
  return !empty && editor.isEditable && state.doc.textBetween(from, to, " ").trim().length > 0;
};

function FormattingBubble({ editor }: { editor: Editor }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [href, setHref] = useState("");
  // Re-render on selection changes too, so the pressed states follow the cursor.
  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      code: ed.isActive("code"),
      link: ed.isActive("link"),
      colour: ed.isActive("textColor"),
      turnInto: TURN_INTO.map((item) => item.active(ed)),
    }),
  });

  const toggle = (next: Exclude<Panel, null>) => {
    if (next === "link" && panel !== "link") setHref((editor.getAttributes("link").href as string | undefined) ?? "");
    setPanel((current) => (current === next ? null : next));
  };

  const applyLink = () => {
    const value = href.trim();
    if (value) editor.chain().focus().extendMarkRange("link").setLink({ href: /^(https?:|mailto:|tel:)/i.test(value) ? value : `https://${value}` }).run();
    else editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setPanel(null);
  };

  return (
    <BubbleMenu
      editor={editor}
      options={BUBBLE_OPTIONS}
      shouldShow={showBubble}
      className="ws-bubble z-50 rounded-[8px] border border-ws-line bg-ws-paper p-1 text-ws-ink"
    >
      <div className="flex items-center gap-0.5" role="toolbar" aria-label="Text formatting">
        <Tool label="Turn into" active={panel === "turn"} onClick={() => toggle("turn")}>
          <span className="hidden sm:inline">Turn into</span> <ChevronDown className="h-3 w-3" />
        </Tool>
        <Divider />
        <Tool label="Bold" active={active.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></Tool>
        <Tool label="Italic" active={active.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></Tool>
        <Tool label="Underline" active={active.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="h-3.5 w-3.5" /></Tool>
        <Tool label="Strikethrough" active={active.strike} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5" /></Tool>
        <Tool label="Inline code" active={active.code} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="h-3.5 w-3.5" /></Tool>
        <Tool label="Link" active={active.link || panel === "link"} onClick={() => toggle("link")}><LinkIcon className="h-3.5 w-3.5" /></Tool>
        <Divider />
        <Tool label="Colour" active={panel === "colour" || active.colour} onClick={() => toggle("colour")}><Palette className="h-3.5 w-3.5" /></Tool>
      </div>

      {panel === "turn" ? (
        <div className="mt-1 grid grid-cols-2 gap-0.5 border-t border-ws-line pt-1">
          {TURN_INTO.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { item.run(editor); setPanel(null); }}
              className={cn("rounded-[4px] px-2 py-1 text-left text-[13px] hover:bg-[var(--ws-hover)]", active.turnInto[index] && "text-ws-accent")}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {panel === "colour" ? (
        <div className="mt-1 flex flex-wrap gap-1 border-t border-ws-line p-1 pt-2">
          {COLOURS.map(({ name, value }) => (
            <button
              key={name}
              type="button"
              aria-label={`${name} text`}
              title={name}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (value) editor.chain().focus().setMark("textColor", { color: value }).run();
                else editor.chain().focus().unsetMark("textColor").run();
                setPanel(null);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-ws-line text-[12px] font-semibold hover:bg-[var(--ws-hover)]"
              style={value ? { color: value } : undefined}
            >
              {value ? "A" : "∅"}
            </button>
          ))}
        </div>
      ) : null}

      {panel === "link" ? (
        <form className="mt-1 flex items-center gap-1 border-t border-ws-line pt-1" onSubmit={(event) => { event.preventDefault(); applyLink(); }}>
          <input
            autoFocus
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="https://…"
            aria-label="Link address"
            className="h-7 min-w-0 flex-1 border border-ws-input-border bg-ws-paper px-2 text-[13px] outline-none"
          />
          <button type="submit" className="h-7 rounded-[4px] bg-ws-accent px-2 text-[13px] font-semibold text-[hsl(var(--ws-accent-fg))]">
            {href.trim() ? "Set" : "Remove"}
          </button>
        </form>
      ) : null}
    </BubbleMenu>
  );
}

// Matches TidySuggestionChip (Ticket Composer).
const CHIP_CLASS =
  "inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2 text-[11px] font-medium text-muted-foreground shadow-sm transition hover:text-foreground";

/** The Ticket Composer's "Tidy up" offer, for a formatted body: appears after typing stops, applies on click, Undo restores. */
function TidyChip({ editor, className }: { editor: Editor; className?: string }) {
  const doc = editor.state.doc;
  const [suggestion, setSuggestion] = useState<{ doc: PMNode; total: number; summary: string } | null>(null);
  const [tidied, setTidied] = useState<PMNode | null>(null);
  const [declined, setDeclined] = useState<PMNode | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = declined && editor.state.doc.eq(declined) ? null : tidyDoc(editor.state);
      setSuggestion(result ? {
        doc: editor.state.doc,
        total: result.total,
        summary: result.fixes.map((fix) => (fix.count > 1 ? `${fix.label} ×${fix.count}` : fix.label)).join(", "),
      } : null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [doc, editor, declined]);

  if (suggestion && suggestion.doc === doc) {
    return (
      <button
        type="button"
        className={cn(CHIP_CLASS, className)}
        title={suggestion.summary}
        aria-label={`Tidy up: ${suggestion.summary}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          const result = tidyDoc(editor.state);
          if (!result) return;
          editor.view.dispatch(result.tr);
          setTidied(editor.state.doc);
        }}
      >
        <SpellCheck className="h-3 w-3" />
        Tidy up · {suggestion.total} {suggestion.total === 1 ? "fix" : "fixes"}
      </button>
    );
  }

  if (tidied && tidied === doc) {
    return (
      <button
        type="button"
        className={cn(CHIP_CLASS, className)}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          editor.commands.undo();
          setDeclined(editor.state.doc);
          setTidied(null);
        }}
      >
        <Undo2 className="h-3 w-3" />
        Undo tidy
      </button>
    );
  }
  return null;
}

export function EmailEditor({
  initialHtml,
  onChange,
  label,
  placeholder,
  compact = false,
  assist = false,
  footer,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  label: string;
  placeholder?: string;
  /** Shorter, for signatures. */
  compact?: boolean;
  /** Dictation and Tidy up, as in the Ticket Composer. */
  assist?: boolean;
  /** Read-only content shown inside the box under the text (the signature). */
  footer?: ReactNode;
}) {
  // Created once: initialHtml seeds it, later edits flow out through onChange.
  const latestOnChange = useRef(onChange);
  useEffect(() => {
    latestOnChange.current = onChange;
  });
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      TextColor,
      EmailImage,
    ],
    content: initialHtml,
    editorProps: { attributes: { "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor: ed }) => latestOnChange.current(ed.getHTML()),
  }, []);

  const insertTranscript = (transcript: string) => {
    if (!editor || !transcript) return;
    const { from } = editor.state.selection;
    const before = from > 1 ? editor.state.doc.textBetween(from - 1, from, "\n", "\n") : "";
    editor.chain().focus().insertContent({ type: "text", text: `${before && !/\s$/.test(before) ? " " : ""}${transcript}` }).run();
  };

  return (
    <div className={cn("email-editor ws-field relative rounded-md border border-input bg-background", compact && "email-editor-compact", assist && "email-editor-assist")}>
      <EditorContent editor={editor} />
      {footer ? <div className="px-3 pb-2">{footer}</div> : null}
      {editor ? <FormattingBubble editor={editor} /> : null}
      {editor && assist ? (
        <>
          <InlineDictationButton ariaLabel="Dictate" position="bottom" showLevelMeter vocabulary={DICTATION_VOCABULARY}
            onValueChange={() => undefined} onTranscript={insertTranscript} />
          <TidyChip editor={editor} className="absolute bottom-1.5 left-2 z-10" />
        </>
      ) : null}
    </div>
  );
}
