import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { buildBaseExtensions } from "@/features/atlas/components/editor/extensions";
import { tiptapDocToCanonical } from "@/lib/wikiCanonical";

let editor: Editor;
const make = (content = "<p></p>") => {
  (globalThis as { ClipboardEvent?: unknown }).ClipboardEvent ??= class extends Event {};
  editor = new Editor({ element: document.body.appendChild(document.createElement("div")), extensions: buildBaseExtensions({}), content });
  return editor;
};
afterEach(() => { editor?.destroy(); document.body.innerHTML = ""; });
const paste = (text: string, html = "", shiftKey = false) => {
  if (shiftKey) editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "v", ctrlKey: true, shiftKey: true, bubbles: true }));
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clipboardData: { value: { getData: (type: string) => type === "text/html" ? html : type === "text/plain" ? text : "", files: [], items: [] } },
  });
  editor.view.dom.dispatchEvent(event);
};

describe("Atlas Markdown paste", () => {
  it("pastes headings, marked text, lists and GFM tables as editable blocks", () => {
    make();
    paste("## Reorder review\n\n**Provisional** quantities\n\n- Count stock\n- Confirm units\n\n| Supplier | Units |\n|---|---:|\n| Example | 195 |\n| Other | 59 |");
    const blocks = tiptapDocToCanonical(editor.getJSON()).blocks;
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list", "table"]);
    expect(editor.getHTML()).toContain("<strong>Provisional</strong>");
    expect(editor.getHTML()).toContain("<h2>Reorder review</h2>");
    expect(editor.view.dom.querySelectorAll("tr")).toHaveLength(3);
    expect(editor.view.dom.querySelectorAll("th")).toHaveLength(2);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getText()).toBe("");
  });

  it("keeps ordinary text literal", () => {
    make();
    paste("Stock is 3 * 4 units.\nNo formatting here.");
    expect(editor.getText()).toContain("3 * 4 units.");
    expect(editor.view.dom.querySelector("table,h1,h2,strong")).toBeNull();
  });

  it("keeps Markdown literal inside a code block", () => {
    make("<pre><code></code></pre>");
    paste("## Literal heading\n\n| A | B |\n|---|---|\n| 1 | 2 |");
    expect(editor.view.dom.querySelector("h2,table")).toBeNull();
    expect(editor.getText()).toContain("## Literal heading");
  });

  it("preserves rich HTML clipboard content", () => {
    make();
    paste("## Not the HTML", '<h2>Copied heading</h2><p><strong>Formatted</strong> content</p>');
    expect(editor.getHTML()).toContain("<h2>Copied heading</h2>");
    expect(editor.getHTML()).toContain("<strong>Formatted</strong>");
  });

  it("allows paste-as-plain-text to keep Markdown literal", () => {
    make();
    paste("## Literal heading", "", true);
    expect(editor.view.dom.querySelector("h2")).toBeNull();
    expect(editor.getText()).toContain("## Literal heading");
  });

  it("keeps every row and leading-zero SKU in a long review", () => {
    make();
    paste(["## Review", "", "| SKU | Quantity |", "|---|---:|", ...Array.from({ length: 59 }, (_, i) => `| 00${i} | **${i + 1}** |`)].join("\n"));
    expect(editor.view.dom.querySelectorAll("tr")).toHaveLength(60);
    expect(editor.getText()).toContain("0058");
    const doc = tiptapDocToCanonical(editor.getJSON());
    expect(doc.blocks.find((block) => block.type === "table")).toMatchObject({ header: true });
  });
});
