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
  | "code"
  | "secret";

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
  { kind: "secret", label: "Secret" },
];

/** A secret replaces text inside one text block, so a selection that spans blocks or sits in code can't become one. */
export const canTurnIntoSecret = (editor: Editor) => {
  const { $from, $to } = editor.state.selection;
  return $from.sameParent($to) && $from.parent.isTextblock && $from.parent.type.name !== "codeBlock";
};

/** The selected text becomes a masked secret field (the text moves into the field's value). */
const turnIntoSecret = (editor: Editor) => {
  if (!canTurnIntoSecret(editor)) return false;
  const { from, to } = editor.state.selection;
  const value = editor.state.doc.textBetween(from, to, " ");
  return editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, { type: "secret", attrs: { value } })
    .run();
};

/** Convert the block holding the selection. `clearNodes` first lifts it out of any list or quote. */
export const turnInto = (editor: Editor, kind: TurnIntoKind) => {
  if (kind === "secret") return turnIntoSecret(editor);
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

/** The table around the caret, if any. */
export const findTable = (editor: Editor): BlockRef | null => {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "table") return { pos: $from.before(depth), node: $from.node(depth) };
  }
  return null;
};

/** Store a pixel width per column (null = share the leftover space). Column widths live on every cell of the column. */
export const setTableColumnWidths = (editor: Editor, widths: (number | null)[]) => {
  const table = findTable(editor);
  if (!table) return false;
  const tr = editor.state.tr;
  table.node.forEach((row, rowOffset) =>
    row.forEach((cell, cellOffset, column) => {
      const width = widths[column];
      tr.setNodeMarkup(table.pos + 1 + rowOffset + 1 + cellOffset, undefined, { ...cell.attrs, colwidth: width ? [width] : null });
    }),
  );
  editor.view.dispatch(tr);
  return true;
};

const AUTOFIT_MIN = 60;
const AUTOFIT_MAX = 480;

/**
 * Size every column to its widest cell. The table is cloned off-screen with no wrapping and automatic layout so the
 * browser reports the natural widths; very long text is capped and wraps once the widths are stored.
 */
export const autofitTableColumns = (editor: Editor) => {
  const table = findTable(editor);
  const wrapper = table ? editor.view.nodeDOM(table.pos) : null;
  const source = wrapper instanceof HTMLElement ? (wrapper.matches("table") ? wrapper : wrapper.querySelector("table")) : null;
  if (!table || !source) return false;

  const probe = document.createElement("div");
  probe.className = editor.view.dom.className;
  probe.style.cssText = "position:absolute;visibility:hidden;left:-99999px;top:0;width:max-content;max-width:none;padding:0;min-height:0";
  const copy = source.cloneNode(true) as HTMLTableElement;
  copy.querySelector("colgroup")?.remove();
  copy.style.cssText = "table-layout:auto;width:auto;min-width:0;max-width:none";
  copy.querySelectorAll("td, th").forEach((cell) => ((cell as HTMLElement).style.whiteSpace = "nowrap"));
  probe.appendChild(copy);
  document.body.appendChild(probe);
  const widths = Array.from(copy.rows[0]?.cells ?? []).map((cell) => Math.min(AUTOFIT_MAX, Math.max(AUTOFIT_MIN, Math.ceil(cell.getBoundingClientRect().width) + 1)));
  probe.remove();

  return setTableColumnWidths(editor, widths);
};

export const resetTableColumnWidths = (editor: Editor) => {
  const table = findTable(editor);
  return table ? setTableColumnWidths(editor, Array.from({ length: table.node.firstChild?.childCount ?? 0 }, () => null)) : false;
};
