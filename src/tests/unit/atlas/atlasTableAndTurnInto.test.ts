import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import { canonicalToTiptapDoc, tiptapDocToCanonical } from "@/lib/wikiCanonical";
import { buildBaseExtensions } from "@/features/atlas/components/editor/extensions";
import { autofitTableColumns, canTurnIntoSecret, resetTableColumnWidths, setTableColumnWidths, turnInto } from "@/features/atlas/components/editor/blockOps";

const cell = (text: string) => [{ type: "text" as const, text }];
const table = (spacing?: "compact" | "spacious"): BlogCanonicalContent => ({
  blocks: [{ type: "table", header: true, ...(spacing ? { spacing } : {}), rows: [[cell("A"), cell("B")], [cell("1"), cell("2")]] }],
});

const editors: Editor[] = [];
const make = (doc: BlogCanonicalContent) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const editor = new Editor({ element: host, extensions: buildBaseExtensions({}), content: canonicalToTiptapDoc(doc) });
  editors.push(editor);
  return { editor, host };
};

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  document.body.innerHTML = "";
});

describe("table spacing", () => {
  it("round-trips through the editor and is left off when comfortable", () => {
    for (const spacing of ["compact", "spacious"] as const) {
      expect(tiptapDocToCanonical(canonicalToTiptapDoc(table(spacing)))).toEqual(table(spacing));
    }
    expect(tiptapDocToCanonical(canonicalToTiptapDoc(table()))).toEqual(table());
  });

  it("updates the table element when the spacing changes", () => {
    const { editor, host } = make(table());
    expect(host.querySelector("table")?.getAttribute("data-spacing")).toBe("normal");
    editor.commands.setTextSelection(3);
    editor.chain().focus().updateAttributes("table", { spacing: "compact" }).run();
    expect(host.querySelector("table")?.getAttribute("data-spacing")).toBe("compact");
    expect(tiptapDocToCanonical(editor.getJSON())).toEqual(table("compact"));
  });
});

describe("table column widths", () => {
  const widths = (editor: Editor) => (tiptapDocToCanonical(editor.getJSON()).blocks[0] as { colWidths?: (number | null)[] }).colWidths;

  it("round-trips, including a partly sized table", () => {
    for (const colWidths of [[120, 200], [150, null]]) {
      const doc = table();
      (doc.blocks[0] as { colWidths?: (number | null)[] }).colWidths = colWidths;
      expect(tiptapDocToCanonical(canonicalToTiptapDoc(doc))).toEqual(doc);
    }
  });

  it("stores widths for every row, and resetting clears them", () => {
    const { editor } = make(table());
    editor.commands.setTextSelection(4);
    expect(setTableColumnWidths(editor, [140, null])).toBe(true);
    expect(widths(editor)).toEqual([140, null]);
    const secondRowFirstCell = (editor.getJSON() as { content: { content: { content: { attrs?: { colwidth?: number[] } }[] }[] }[] }).content[0].content[1].content[0];
    expect(secondRowFirstCell.attrs?.colwidth).toEqual([140]);
    resetTableColumnWidths(editor);
    expect(widths(editor)).toBeUndefined();
  });

  it("autofit stores a clamped width for each column", () => {
    const { editor } = make(table());
    editor.commands.setTextSelection(4);
    expect(autofitTableColumns(editor)).toBe(true);
    expect(widths(editor)).toHaveLength(2);
    expect(widths(editor)?.every((width) => typeof width === "number" && width >= 60 && width <= 480)).toBe(true);
    expect(document.body.querySelectorAll("div[style*='-99999px']")).toHaveLength(0);
  });
});

describe("table rows and columns", () => {
  it("adds and removes rows and columns around the caret", () => {
    const { editor } = make(table());
    editor.commands.setTextSelection(3);
    const rows = () => (tiptapDocToCanonical(editor.getJSON()).blocks[0] as Extract<BlogCanonicalContent["blocks"][number], { type: "table" }>).rows;

    editor.chain().focus().addRowAfter().run();
    expect(rows()).toHaveLength(3);
    editor.chain().focus().addColumnAfter().run();
    expect(rows()[0]).toHaveLength(3);
    editor.chain().focus().deleteColumn().run();
    expect(rows()[0]).toHaveLength(2);
    editor.chain().focus().deleteRow().run();
    expect(rows()).toHaveLength(2);
    editor.chain().focus().deleteTable().run();
    expect(tiptapDocToCanonical(editor.getJSON()).blocks).toEqual([]);
  });
});

describe("Turn into → Secret", () => {
  const paragraph: BlogCanonicalContent = { blocks: [{ type: "paragraph", children: [{ type: "text", text: "Login: hunter2" }] }] };

  it("moves the selected text into a masked secret", () => {
    const { editor } = make(paragraph);
    // "Login: " is 7 characters, so the password sits at 8–15 (ProseMirror positions start after the block opens).
    editor.commands.setTextSelection({ from: 8, to: 15 });
    expect(canTurnIntoSecret(editor)).toBe(true);
    turnInto(editor, "secret");
    const canonical = tiptapDocToCanonical(editor.getJSON());
    expect(canonical.blocks[0]).toMatchObject({ type: "paragraph", children: [{ type: "text", text: "Login: " }, { type: "secret", value: "hunter2" }] });
  });

  it("works inside a table cell", () => {
    const { editor } = make(table());
    editor.commands.setTextSelection({ from: 4, to: 5 }); // the "A" in the first cell
    turnInto(editor, "secret");
    expect(JSON.stringify(tiptapDocToCanonical(editor.getJSON()))).toContain('"type":"secret","value":"A"');
  });

  it("is refused across blocks and inside code", () => {
    const two: BlogCanonicalContent = { blocks: [{ type: "paragraph", children: [{ type: "text", text: "one" }] }, { type: "paragraph", children: [{ type: "text", text: "two" }] }] };
    const { editor } = make(two);
    editor.commands.setTextSelection({ from: 2, to: 8 });
    expect(canTurnIntoSecret(editor)).toBe(false);
    expect(turnInto(editor, "secret")).toBe(false);

    const { editor: code } = make({ blocks: [{ type: "code", text: "token" }] });
    code.commands.setTextSelection({ from: 1, to: 6 });
    expect(canTurnIntoSecret(code)).toBe(false);
  });
});
