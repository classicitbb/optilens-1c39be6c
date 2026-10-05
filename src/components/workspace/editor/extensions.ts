import { Extension, Mark, Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Blockquote } from "@tiptap/extension-blockquote";
import Link from "@tiptap/extension-link";
import { ListItem, TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Suggestion, { type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";
import StarterKit from "@tiptap/starter-kit";
import { isBlogColorName } from "@/components/blog/BlogPostRenderer";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wsColor: {
      setWsColor: (attrs: { color?: string | null; background?: string | null }) => ReturnType;
      unsetWsColor: () => ReturnType;
    };
  }
}

export interface AskIrisRequest {
  prompt?: string;
  selection?: string;
}

const colorOrNull = (value: unknown) => (isBlogColorName(value) ? value : null);

// ── Blocks ─────────────────────────────────────────────────────────────────

/** Canonical list items hold one line of inline content, so items are a single paragraph and Tab does not nest. */
const FlatListItem = ListItem.extend({
  content: "paragraph",
  addKeyboardShortcuts() {
    return { Enter: () => this.editor.commands.splitListItem(this.name) };
  },
});

/** Canonical quotes hold one line of inline content. `"` + space makes one; `> ` makes a toggle. */
const QuoteBlock = Blockquote.extend({
  content: "paragraph",
  addInputRules() {
    return [wrappingInputRule({ find: /^\s*["“”]\s$/, type: this.type })];
  },
});

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      icon: { default: null, rendered: false },
      color: { default: null, rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-callout-node]" }];
  },
  renderHTML({ node }) {
    const color = colorOrNull(node.attrs.color);
    const icon = (node.attrs.icon as string | null) || "💡";
    return [
      "div",
      mergeAttributes({
        "data-callout-node": "",
        class: color ? `ws-callout-node ws-bg-${color}` : "ws-callout-node",
      }),
      ["span", { class: "ws-callout-icon", contenteditable: "false" }, icon],
      ["div", { class: "ws-callout-body" }, 0],
    ];
  },
});

/** First child is the always-visible summary line; everything after it folds away. */
const Toggle = Node.create({
  name: "toggle",
  group: "block",
  content: "paragraph block*",
  defining: true,
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({ "data-open": String(attributes.open !== false) }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-toggle]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-toggle": "" }, HTMLAttributes), 0];
  },
  addInputRules() {
    return [wrappingInputRule({ find: /^\s*>\s$/, type: this.type })];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "ws-toggle-node";
      dom.dataset.open = String(node.attrs.open !== false);

      const caret = document.createElement("button");
      caret.type = "button";
      caret.contentEditable = "false";
      caret.className = "ws-toggle-caret";
      caret.setAttribute("aria-label", "Show or hide content");
      caret.addEventListener("mousedown", (event) => event.preventDefault());
      caret.addEventListener("click", () => {
        const pos = getPos();
        if (typeof pos !== "number") return;
        const current = editor.state.doc.nodeAt(pos);
        if (!current) return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, open: current.attrs.open === false }));
      });

      const contentDOM = document.createElement("div");
      contentDOM.className = "ws-toggle-content";
      dom.append(caret, contentDOM);

      return {
        dom,
        contentDOM,
        update(updated) {
          if (updated.type.name !== "toggle") return false;
          dom.dataset.open = String(updated.attrs.open !== false);
          return true;
        },
      };
    };
  },
});

const ImageBlock = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: null } };
  },
  parseHTML() {
    return [{ tag: "img[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes, { class: "ws-image" })];
  },
});

const PageLink = Node.create({
  name: "pageLink",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      articleId: { default: null },
      title: { default: "Untitled" },
      slug: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-page-link-node]" }];
  },
  renderHTML({ node }) {
    return ["div", { "data-page-link-node": "", class: "ws-page-link-node" }, `📄 ${node.attrs.title || "Untitled"}`];
  },
});

/** Carries a canonical block the editor has no node for, so saving never drops it. */
const UnknownBlock = Node.create({
  name: "unknownBlock",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { raw: { default: "{}", rendered: false } };
  },
  parseHTML() {
    return [{ tag: "div[data-unknown-block-node]" }];
  },
  renderHTML({ node }) {
    let type = "unknown";
    try {
      type = String(JSON.parse(String(node.attrs.raw)).type ?? "unknown");
    } catch {
      /* keep "unknown" */
    }
    return ["div", { "data-unknown-block-node": "", class: "ws-unknown-block-node" }, `Unsupported block “${type}”. It is kept and will be saved unchanged.`];
  },
});

// ── Inline ─────────────────────────────────────────────────────────────────

const WsColor = Mark.create({
  name: "wsColor",
  addAttributes() {
    return {
      color: { default: null, rendered: false },
      background: { default: null, rendered: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-color], span[data-background]",
        getAttrs: (element) => ({
          color: colorOrNull((element as HTMLElement).getAttribute("data-color")),
          background: colorOrNull((element as HTMLElement).getAttribute("data-background")),
        }),
      },
    ];
  },
  renderHTML({ mark }) {
    const color = colorOrNull(mark.attrs.color);
    const background = colorOrNull(mark.attrs.background);
    return ["span", { class: [color && `ws-color-${color}`, background && `ws-bg-${background}`].filter(Boolean).join(" ") }, 0];
  },
  addCommands() {
    return {
      setWsColor:
        (attrs) =>
        ({ chain, editor }) => {
          const current = editor.getAttributes("wsColor");
          const next = { color: current.color ?? null, background: current.background ?? null, ...attrs };
          return next.color || next.background ? chain().setMark("wsColor", next).run() : chain().unsetMark("wsColor").run();
        },
      unsetWsColor:
        () =>
        ({ chain }) =>
          chain().unsetMark("wsColor").run(),
    };
  },
});

const Mention = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      kind: { default: "page" },
      label: { default: "" },
      id: { default: null },
      slug: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-mention]", getAttrs: (element) => ({ kind: (element as HTMLElement).getAttribute("data-mention") ?? "page", label: (element as HTMLElement).textContent ?? "" }) }];
  },
  renderHTML({ node }) {
    const label = String(node.attrs.label ?? "");
    return ["span", { class: "ws-mention", "data-mention": String(node.attrs.kind) }, node.attrs.kind === "person" ? `@${label}` : label];
  },
  renderText({ node }) {
    return String(node.attrs.label ?? "");
  },
});

// ── Keys and behaviours ────────────────────────────────────────────────────

/**
 * - Backspace at the start of a heading, callout, code block, quote or to-do
 *   turns it into a paragraph; in a paragraph it merges with the block above.
 * - Enter at the end of a callout or quote starts a new paragraph below it;
 *   Enter on an empty list item turns it into a paragraph (list default).
 */
const BlockKeys = Extension.create({
  name: "blockKeys",
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;
        const { $from } = selection;
        if ($from.parentOffset !== 0) return false;
        const parent = $from.parent.type.name;

        if (parent === "heading" || parent === "callout" || parent === "codeBlock") {
          return editor.commands.setNode("paragraph");
        }
        if (parent === "paragraph" && $from.depth > 1) {
          const container = $from.node(-1).type.name;
          if (container === "blockquote") return editor.commands.lift("blockquote");
          if (container === "taskItem") return editor.commands.liftListItem("taskItem");
        }
        return false;
      },
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;
        const { $from } = selection;
        const atEnd = $from.parentOffset === $from.parent.content.size;
        if (!atEnd || $from.parent.content.size === 0) return false;

        if ($from.parent.type.name === "callout") {
          const after = $from.after();
          return editor.chain().insertContentAt(after, { type: "paragraph" }).focus(after + 1).run();
        }
        if ($from.parent.type.name === "paragraph" && $from.depth > 1 && $from.node(-1).type.name === "blockquote") {
          const after = $from.after(-1);
          return editor.chain().insertContentAt(after, { type: "paragraph" }).focus(after + 1).run();
        }
        return false;
      },
    };
  },
});

/** Space on an empty top-level line opens Iris with "Write about…". */
const IrisSpace = Extension.create<{ onAskIris?: (request: AskIrisRequest) => void }>({
  name: "irisSpace",
  addOptions() {
    return { onAskIris: undefined };
  },
  addProseMirrorPlugins() {
    const { onAskIris } = this.options;
    return [
      new Plugin({
        key: new PluginKey("irisSpace"),
        props: {
          handleKeyDown: (view, event) => {
            if (event.key !== " " || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || !onAskIris) return false;
            const { selection } = view.state;
            const { $from } = selection;
            if (!selection.empty || $from.depth !== 1 || $from.parent.type.name !== "paragraph" || $from.parent.content.size !== 0) return false;
            event.preventDefault();
            onAskIris({ prompt: "Write about…" });
            return true;
          },
        },
      }),
    ];
  },
});

// ── Suggestions ────────────────────────────────────────────────────────────

export interface SuggestionBridge<TItem> {
  onStart: (props: SuggestionProps<TItem, TItem>) => void;
  onUpdate: (props: SuggestionProps<TItem, TItem>) => void;
  onKeyDown: (event: KeyboardEvent) => boolean;
  onExit: () => void;
}

export const slashKey = new PluginKey("slashSuggestion");
export const mentionKey = new PluginKey("mentionSuggestion");

export const createSuggestionExtension = <TItem,>({
  name,
  char,
  pluginKey,
  getItems,
  run,
  bridge,
}: {
  name: string;
  char: string;
  pluginKey: PluginKey;
  getItems: SuggestionOptions<TItem, TItem>["items"];
  run: (args: { editor: Editor; range: Range; item: TItem }) => void;
  bridge: SuggestionBridge<TItem>;
}) =>
  Extension.create({
    name,
    addProseMirrorPlugins() {
      return [
        Suggestion<TItem, TItem>({
          editor: this.editor,
          char,
          pluginKey,
          allowSpaces: false,
          items: getItems,
          allow: ({ state, range }) => {
            const $from = state.doc.resolve(range.from);
            return $from.parent.type.name !== "codeBlock";
          },
          command: ({ editor, range, props }) => run({ editor, range, item: props }),
          render: () => ({
            onStart: (props) => bridge.onStart(props),
            onUpdate: (props) => bridge.onUpdate(props),
            onKeyDown: ({ event }) => bridge.onKeyDown(event),
            onExit: () => bridge.onExit(),
          }),
        }),
      ];
    },
  });

// ── Assembly ───────────────────────────────────────────────────────────────

export const buildBaseExtensions = (options: { onAskIris?: (request: AskIrisRequest) => void }) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    link: false,
    listItem: false,
    blockquote: false,
  }),
  FlatListItem,
  QuoteBlock,
  TaskList,
  TaskItem.configure({ nested: false }),
  Callout,
  Toggle,
  ImageBlock,
  PageLink,
  UnknownBlock,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader.extend({ content: "paragraph" }),
  TableCell.extend({ content: "paragraph" }),
  Link.configure({ openOnClick: false, HTMLAttributes: { class: "ws-link" } }),
  WsColor,
  Mention,
  BlockKeys,
  IrisSpace.configure({ onAskIris: options.onAskIris }),
  Placeholder.configure({
    placeholder: ({ node }) => (node.type.name === "heading" ? "Heading" : "Type '/' for commands, '@' to mention"),
    showOnlyCurrent: true,
  }),
];
