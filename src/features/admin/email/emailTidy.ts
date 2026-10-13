import type { EditorState, Transaction } from "@tiptap/pm/state";
import { tidyText, type TidyFix } from "@/lib/textTidy";

// The Ticket Composer's tidy (src/lib/textTidy.ts) applied to a formatted
// body: each paragraph, heading and list item is tidied as its own text, and
// only the changed characters are replaced, so bold, links and colour on the
// surrounding words stay where they were.

type Edit = { at: number; remove: number; insert: string };

const MAX_CELLS = 4_000_000;

/** Minimal character edits turning `a` into `b` (LCS); null when the block is too long to diff. */
export function charEdits(a: string, b: string): Edit[] | null {
  const n = a.length;
  const m = b.length;
  if ((n + 1) * (m + 1) > MAX_CELLS) return null;
  const width = m + 1;
  const lcs = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] = a[i] === b[j] ? lcs[(i + 1) * width + j + 1] + 1 : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }
  const edits: Edit[] = [];
  let current: Edit | null = null;
  let i = 0;
  let j = 0;
  const flush = () => {
    if (current) edits.push(current);
    current = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      i += 1;
      j += 1;
    } else if (j >= m || (i < n && lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) {
      current ??= { at: i, remove: 0, insert: "" };
      current.remove += 1;
      i += 1;
    } else {
      current ??= { at: i, remove: 0, insert: "" };
      current.insert += b[j];
      j += 1;
    }
  }
  flush();
  return edits;
}

export type DocTidy = { tr: Transaction; total: number; fixes: TidyFix[] };

/** A transaction tidying every plain-text block of the document, or null when nothing needs fixing. */
export function tidyDoc(state: EditorState): DocTidy | null {
  const blocks: { start: number; edits: Edit[]; fixes: TidyFix[] }[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (node.type.name === "codeBlock" || node.childCount === 0) return false;
    // Images or line breaks inside the block would shift text offsets; leave those blocks alone.
    let textOnly = true;
    node.forEach((child) => { if (!child.isText) textOnly = false; });
    if (!textOnly) return false;
    const text = node.textContent;
    const result = tidyText(text, node.type.name === "heading" ? "title" : "sentence");
    if (result.total === 0) return false;
    const edits = charEdits(text, result.text);
    if (edits?.length) blocks.push({ start: pos + 1, edits, fixes: result.fixes });
    return false;
  });
  if (!blocks.length) return null;

  const tr = state.tr;
  // Later positions first, so earlier ones stay valid.
  for (const block of [...blocks].reverse()) {
    for (const edit of [...block.edits].reverse()) {
      const from = block.start + edit.at;
      if (edit.insert) tr.insertText(edit.insert, from, from + edit.remove);
      else tr.delete(from, from + edit.remove);
    }
  }
  const totals = new Map<string, number>();
  for (const fix of blocks.flatMap((block) => block.fixes)) totals.set(fix.label, (totals.get(fix.label) ?? 0) + fix.count);
  const fixes = [...totals].map(([label, count]) => ({ label, count }));
  return { tr, fixes, total: fixes.reduce((sum, fix) => sum + fix.count, 0) };
}
