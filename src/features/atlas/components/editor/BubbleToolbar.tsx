import { useState } from "react";
import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, ChevronDown, Code, Italic, Link as LinkIcon, MessageSquare, Palette, Sparkles, Strikethrough, Underline } from "lucide-react";
import { BLOG_COLOR_NAMES } from "@/components/blog/BlogPostRenderer";
import { cn } from "@/lib/utils";
import { TURN_INTO, turnInto } from "./blockOps";
import type { AskIrisRequest } from "./extensions";

type Panel = "turn" | "color" | "link" | null;

const Tool = ({ active, label, onClick, disabled, children }: { active?: boolean; label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={cn(
      "flex h-7 min-w-7 items-center justify-center gap-1 whitespace-nowrap rounded-[4px] px-1.5 text-[13px] text-ws-ink-2 hover:bg-[var(--ws-hover)] disabled:cursor-not-allowed disabled:opacity-40",
      active && "bg-ws-accent-tint text-ws-accent",
    )}
  >
    {children}
  </button>
);

const Divider = () => <span className="mx-0.5 h-5 w-px bg-ws-line" aria-hidden />;

const SwatchRow = ({ label, onPick, kind }: { label: string; kind: "color" | "background"; onPick: (name: string | null) => void }) => (
  <div>
    <p className="ws-label px-1 pb-1 text-[10px] text-ws-ink-3">{label}</p>
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        aria-label={`Default ${label.toLowerCase()}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPick(null)}
        className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-ws-line text-[11px] text-ws-ink-3 hover:bg-[var(--ws-hover)]"
      >
        ∅
      </button>
      {BLOG_COLOR_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={`${name} ${label.toLowerCase()}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(name)}
          className={cn("flex h-6 w-6 items-center justify-center rounded-[4px] border border-ws-line text-[12px] font-semibold", kind === "color" ? `ws-color-${name}` : `ws-bg-${name} text-ws-ink`)}
        >
          A
        </button>
      ))}
    </div>
  </div>
);

interface BubbleToolbarProps {
  editor: Editor;
  onAskIris: (request: AskIrisRequest) => void;
}

/** Appears over selected text: Ask Iris | Turn into | B I U S code link | colour | comment. */
const BubbleToolbar = ({ editor, onAskIris }: BubbleToolbarProps) => {
  const [panel, setPanel] = useState<Panel>(null);
  const [href, setHref] = useState("");

  const togglePanel = (next: Exclude<Panel, null>) => {
    if (next === "link" && panel !== "link") setHref((editor.getAttributes("link").href as string | undefined) ?? "");
    setPanel((current) => (current === next ? null : next));
  };

  const applyLink = () => {
    const value = href.trim();
    if (value) editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    else editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setPanel(null);
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor: ed, state }) => {
        const { from, to, empty } = state.selection;
        if (empty || !ed.isEditable) return false;
        if (ed.isActive("codeBlock") || ed.isActive("image") || ed.isActive("pageLink") || ed.isActive("unknownBlock")) return false;
        return state.doc.textBetween(from, to, " ").trim().length > 0;
      }}
      className="ws-bubble z-50 rounded-[8px] border border-ws-line bg-ws-paper p-1 text-ws-ink"
    >
      <div className="flex items-center gap-0.5" role="toolbar" aria-label="Text formatting">
        <Tool
          label="Ask Iris"
          onClick={() => {
            const { from, to } = editor.state.selection;
            onAskIris({ selection: editor.state.doc.textBetween(from, to, " "), range: { from, to } });
          }}
        >
          <Sparkles className="h-3.5 w-3.5 text-ws-accent" /> <span className="hidden sm:inline">Ask Iris</span>
        </Tool>
        <Divider />
        <Tool label="Turn into" active={panel === "turn"} onClick={() => togglePanel("turn")}>
          <span className="hidden sm:inline">Turn into</span> <ChevronDown className="h-3 w-3" />
        </Tool>
        <Divider />
        <Tool label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </Tool>
        <Tool label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </Tool>
        <Tool label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline className="h-3.5 w-3.5" />
        </Tool>
        <Tool label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </Tool>
        <Tool label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-3.5 w-3.5" />
        </Tool>
        <Tool label="Link" active={editor.isActive("link") || panel === "link"} onClick={() => togglePanel("link")}>
          <LinkIcon className="h-3.5 w-3.5" />
        </Tool>
        <Divider />
        <Tool label="Colour" active={panel === "color" || editor.isActive("wsColor")} onClick={() => togglePanel("color")}>
          <Palette className="h-3.5 w-3.5" />
        </Tool>
        <Tool label="Comment (comments aren't available yet)" disabled onClick={() => undefined}>
          <MessageSquare className="h-3.5 w-3.5" />
        </Tool>
      </div>

      {panel === "turn" ? (
        <div className="mt-1 grid grid-cols-2 gap-0.5 border-t border-ws-line pt-1">
          {TURN_INTO.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                turnInto(editor, kind);
                setPanel(null);
              }}
              className="rounded-[4px] px-2 py-1 text-left text-[13px] hover:bg-[var(--ws-hover)]"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {panel === "color" ? (
        <div className="mt-1 space-y-2 border-t border-ws-line p-1 pt-2">
          <SwatchRow label="Text" kind="color" onPick={(name) => editor.chain().focus().setWsColor({ color: name }).run()} />
          <SwatchRow label="Background" kind="background" onPick={(name) => editor.chain().focus().setWsColor({ background: name }).run()} />
        </div>
      ) : null}

      {panel === "link" ? (
        <form
          className="mt-1 flex items-center gap-1 border-t border-ws-line pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <input
            autoFocus
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="https://… or /path"
            aria-label="Link address"
            className="h-7 min-w-0 flex-1 border border-ws-input-border bg-ws-paper px-2 text-[13px] outline-none focus:border-ws-accent"
          />
          <button type="submit" className="h-7 rounded-[4px] bg-ws-accent px-2 text-[13px] font-semibold text-[hsl(var(--ws-accent-fg))]">
            {href.trim() ? "Set" : "Remove"}
          </button>
        </form>
      ) : null}
    </BubbleMenu>
  );
};

export default BubbleToolbar;
