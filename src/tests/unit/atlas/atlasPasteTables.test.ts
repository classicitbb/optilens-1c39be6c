import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { tiptapDocToCanonical } from "@/lib/wikiCanonical";
import { buildBaseExtensions } from "@/features/atlas/components/editor/extensions";
import { unmergeTableCells } from "@/features/atlas/components/editor/pasteTables";

const rowsOf = (html: string) =>
  Array.from(new DOMParser().parseFromString(unmergeTableCells(html), "text/html").querySelectorAll("tr")).map((row) =>
    Array.from(row.cells).map((cell) => `${cell.tagName.toLowerCase()}:${cell.textContent}`),
  );

describe("unmergeTableCells", () => {
  it("leaves html without merged cells untouched", () => {
    const html = "<table><tr><td>a</td><td>b</td></tr></table>";
    expect(unmergeTableCells(html)).toBe(html);
    expect(unmergeTableCells("<p>colspan in prose</p>")).toBe("<p>colspan in prose</p>");
  });

  it("splits column and row spans into plain cells that repeat the content", () => {
    const html =
      '<table><tr><th colspan="2">Head</th><th>C</th></tr><tr><td rowspan="2">Tall</td><td>b1</td><td>c1</td></tr><tr><td>b2</td><td>c2</td></tr></table>';
    expect(rowsOf(html)).toEqual([
      ["th:Head", "th:Head", "th:C"],
      ["td:Tall", "td:b1", "td:c1"],
      ["td:Tall", "td:b2", "td:c2"],
    ]);
  });

  it("handles a block that spans both ways and a row span that runs past the table", () => {
    const html = '<table><tr><td colspan="2" rowspan="2">Big</td><td>x</td></tr><tr><td>y</td></tr><tr><td rowspan="9">z</td><td>1</td><td>2</td></tr></table>';
    expect(rowsOf(html)).toEqual([
      ["td:Big", "td:Big", "td:x"],
      ["td:Big", "td:Big", "td:y"],
      ["td:z", "td:1", "td:2"],
    ]);
  });
});

describe("pasting a merged table into the editor", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("saves a rectangular table with every cell in its own column", () => {
    // jsdom has no ClipboardEvent, which ProseMirror needs to build a paste.
    (globalThis as { ClipboardEvent?: unknown }).ClipboardEvent ??= class extends Event {};
    editor = new Editor({
      element: document.body.appendChild(document.createElement("div")),
      extensions: buildBaseExtensions({}),
      content: { type: "doc", content: [{ type: "paragraph" }] },
      editorProps: { transformPastedHTML: unmergeTableCells },
    });
    editor.view.pasteHTML('<table><tr><th colspan="2">Head</th><th>C</th></tr><tr><td>a</td><td>b</td><td>c</td></tr></table>');
    const table = tiptapDocToCanonical(editor.getJSON()).blocks.find((block) => block.type === "table");
    const text = (cell: unknown) => (cell as { text?: string }[]).map((node) => node.text).join("");
    expect(table && "rows" in table ? table.rows.map((row) => row.map(text)) : null).toEqual([
      ["Head", "Head", "C"],
      ["a", "b", "c"],
    ]);
  });
});
