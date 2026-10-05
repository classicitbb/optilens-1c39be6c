import { describe, expect, it } from "vitest";
import { canonicalToMarkdown } from "@/lib/wikiMarkdown";

describe("canonicalToMarkdown", () => {
  it("exports every canonical block type", () => {
    const md = canonicalToMarkdown("Frame returns", {
      blocks: [
        { type: "heading", level: 2, children: [{ type: "text", text: "Steps" }] },
        {
          type: "paragraph",
          children: [
            { type: "text", text: "See " },
            { type: "strong", children: [{ type: "text", text: "policy" }] },
            { type: "text", text: " and " },
            { type: "link", href: "/returns", children: [{ type: "text", text: "returns" }] },
          ],
        },
        { type: "list", ordered: true, items: [[{ type: "text", text: "Pack" }], [{ type: "text", text: "Ship" }]] },
        { type: "list", ordered: false, items: [[{ type: "emphasis", children: [{ type: "text", text: "Tip" }] }]] },
        { type: "blockquote", children: [{ type: "text", text: "Be kind" }] },
        { type: "image", src: "/a.png", alt: "Box" },
      ],
    });

    expect(md).toBe(
      [
        "# Frame returns",
        "## Steps",
        "See **policy** and [returns](/returns)",
        "1. Pack\n2. Ship",
        "- *Tip*",
        "> Be kind",
        "![Box](/a.png)",
      ].join("\n\n") + "\n",
    );
  });

  it("falls back to Untitled", () => {
    expect(canonicalToMarkdown("  ", { blocks: [] })).toBe("# Untitled\n");
  });
});
