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

describe("canonicalToMarkdown: workspace blocks", () => {
  it("exports the new blocks and inline marks", () => {
    const t = (text: string) => ({ type: "text" as const, text });
    const md = canonicalToMarkdown("T", {
      blocks: [
        { type: "todo", items: [{ checked: true, children: [t("Done")] }, { checked: false, children: [t("Open")] }] },
        { type: "callout", icon: "⚠️", children: [t("Careful")] },
        { type: "code", language: "ts", text: "a();" },
        { type: "divider" },
        { type: "toggle", summary: [t("More")], children: [{ type: "paragraph", children: [t("Body")] }] },
        { type: "table", header: true, rows: [[[t("A")], [t("B|C")]], [[t("1")], [t("2")]]] },
        { type: "pageLink", articleId: "x", title: "Other", slug: "other" },
        {
          type: "paragraph",
          children: [
            { type: "strike", children: [t("old")] },
            t(" "),
            { type: "code", children: [t("x")] },
            t(" "),
            { type: "mention", kind: "person", label: "Ada" },
          ],
        },
      ],
    });
    expect(md).toContain("- [x] Done\n- [ ] Open");
    expect(md).toContain("> ⚠️ Careful");
    expect(md).toContain("```ts\na();\n```");
    expect(md).toContain("\n---\n");
    expect(md).toContain("<details>\n<summary>More</summary>\n\nBody\n\n</details>");
    expect(md).toContain("| A | B\\|C |\n| --- | --- |\n| 1 | 2 |");
    expect(md).toContain("[Other](/knowledge/other)");
    expect(md).toContain("~~old~~ `x` @Ada");
  });
});

describe("canonicalToMarkdown: nested lists", () => {
  it("indents nested items and restarts numbering per level", () => {
    const t = (text: string) => ({ type: "text" as const, text });
    const md = canonicalToMarkdown("T", {
      blocks: [
        { type: "list", ordered: true, items: [[t("one")], [t("one-a")], [t("one-b")], [t("two")]], depths: [0, 1, 1, 0] },
        { type: "todo", items: [{ checked: false, children: [t("p")] }, { checked: true, children: [t("c")], depth: 1 }] },
      ],
    });
    expect(md).toContain("1. one\n  1. one-a\n  2. one-b\n2. two");
    expect(md).toContain("- [ ] p\n  - [x] c");
  });
});
