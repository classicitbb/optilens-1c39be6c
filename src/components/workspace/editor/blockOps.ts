import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";
import { isBlogColorName } from "@/components/blog/BlogPostRenderer";

export type TurnIntoKind =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "number"
  | "todo"
  | "toggle"
  | "quote"
  | "callout"
  | "code";

export const TURN_INTO: { kind: TurnIntoKind; label: string }[] = [
  { kind: "paragraph", label: "Text" },
  { kind: "h1", label: "Heading 1" },
  { kind: "h2", label: "Heading 2" },
  { kind: "h3", label: "Heading 3" },
  { kind: "bullet", label: "Bulleted list" },
  { kind: "number", label: "Numbered list" },
  { kind: "todo", label: "To-do list" },
  { kind: "toggle", label: "Toggle" },
  { kind: "quote", label: "Quote" },
  { kind: "callout", label: "Callout" },
  { kind: "code", label: "Code" },
];

/** Convert the block holding the selection. `clearNodes` first lifts it out of any list or quote. */
export const turnInto = (editor: Editor, kind: TurnIntoKind) => {
  const chain = editor.chain().focus().clearNodes();
  switch (kind) {
    case "paragraph":
      return chain.run();
    case "h1":
    case "h2":
    case "h3":
      return chain.setNode("heading", { level: Number(kind[1]) }).run();
    case "bullet":
      return chain.toggleBulletList().run();
    case "number":
      return chain.toggleOrderedList().run();
    case "todo":
      return chain.toggleTaskList().run();
    case "toggle":
      return chain.wrapIn("toggle").run();
    case "quote":
      return chain.setBlockquote().run();
    case "callout":
      return chain.setNode("callout").run();
    case "code":
      return chain.setCodeBlock().run();
  }
};

export interface BlockRef {
  pos: number;
  node: PMNode;
}

/** The top-level block that contains `pos`. */
export const topLevelBlockAt = (editor: Editor, pos: number): BlockRef | null => {
  const { doc } = editor.state;
  if (doc.childCount === 0) return null;
  const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));
  if ($pos.depth === 0) {
    const node = $pos.nodeAfter ?? $pos.nodeBefore;
    if (!node) return null;
    return { pos: $pos.nodeAfter ? $pos.pos : $pos.pos - node.nodeSize, node };
  }
  const start = $pos.before(1);
  const node = doc.nodeAt(start);
  return node ? { pos: start, node } : null;
};

/** The block's whole text span, so list conversions and colours cover every item. */
export const blockTextRange = (editor: Editor, block: BlockRef) => {
  const { doc } = editor.state;
  return {
    from: Selection.near(doc.resolve(block.pos + 1), 1).from,
    to: Selection.near(doc.resolve(block.pos + block.node.nodeSize - 1), -1).to,
  };
};

export const blockText = (block: BlockRef) => block.node.textContent;

export const duplicateBlock = (editor: Editor, block: BlockRef) =>
  editor.chain().focus().insertContentAt(block.pos + block.node.nodeSize, block.node.toJSON()).run();

export const deleteBlock = (editor: Editor, block: BlockRef) =>
  editor.chain().focus().deleteRange({ from: block.pos, to: block.pos + block.node.nodeSize }).run();

/** Put the caret at the end of a fresh paragraph below the block, typed with "/" so the slash menu opens. */
export const addBlockBelow = (editor: Editor, block: BlockRef) => {
  const at = block.pos + block.node.nodeSize;
  editor
    .chain()
    .focus()
    .insertContentAt(at, { type: "paragraph", content: [{ type: "text", text: "/" }] })
    .setTextSelection(at + 2)
    .run();
};

/** Text colour or background for a whole block. Callouts keep their colour as a block attribute. */
export const colorBlock = (editor: Editor, block: BlockRef, colors: { color?: string | null; background?: string | null }) => {
  if (block.node.type.name === "callout") {
    const next = colors.background ?? colors.color ?? null;
    const tr = editor.state.tr.setNodeMarkup(block.pos, undefined, { ...block.node.attrs, color: isBlogColorName(next) ? next : null });
    editor.view.dispatch(tr);
    return true;
  }
  if (block.node.isAtom || block.node.childCount === 0) return false;
  return editor
    .chain()
    .focus()
    .setTextSelection(blockTextRange(editor, block))
    .setWsColor(colors)
    .run();
};

export const setCalloutIcon = (editor: Editor, block: BlockRef, icon: string | null) => {
  if (block.node.type.name !== "callout") return false;
  editor.view.dispatch(editor.state.tr.setNodeMarkup(block.pos, undefined, { ...block.node.attrs, icon }));
  return true;
};
