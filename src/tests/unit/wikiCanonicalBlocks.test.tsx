import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BlogPostRenderer from "@/components/blog/BlogPostRenderer";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import {
  canonicalToHtml,
  canonicalToTiptapDoc,
  tiptapDocToCanonical,
  validateCanonicalDocument,
} from "@/lib/wikiCanonical";

const t = (text: string) => ({ type: "text" as const, text });

/** One of every block and inline type. Marks are nested in the canonical order. */
const everything: BlogCanonicalContent = {
  blocks: [
    { type: "heading", level: 2, children: [t("Heading")] },
    {
      type: "paragraph",
      children: [
        t("Plain "),
        { type: "link", href: "https://example.com", children: [{ type: "strong", children: [t("bold link")] }] },
        t(" "),
        { type: "color", color: "blue", background: "yellow", children: [{ type: "emphasis", children: [{ type: "underline", children: [{ type: "strike", children: [t("styled")] }] }] }] },
        t(" "),
        { type: "code", children: [t("SKU-1")] },
        t(" "),
        { type: "mention", kind: "page", label: "Returns", id: "p1", slug: "returns" },
        t(" "),
        { type: "mention", kind: "person", label: "Ada", id: "u1" },
        t(" "),
        { type: "mention", kind: "date", label: "Oct 5, 2026" },
      ],
    },
    { type: "list", ordered: false, items: [[t("One")], [t("Two")]] },
    { type: "list", ordered: true, items: [[t("First")]] },
    { type: "todo", items: [{ checked: true, children: [t("Done")] }, { checked: false, children: [t("Open")] }] },
    { type: "blockquote", children: [t("Quote")] },
    { type: "callout", icon: "⚠️", color: "orange", children: [t("Careful")] },
    {
      type: "toggle",
      summary: [t("More")],
      children: [
        { type: "paragraph", children: [t("Hidden")] },
        { type: "list", ordered: false, items: [[t("Nested")]] },
      ],
    },
    { type: "code", language: "ts", text: "const a = 1;\nconst b = 2;" },
    { type: "divider" },
    { type: "image", src: "/a.png", alt: "Alt" },
    {
      type: "table",
      header: true,
      rows: [
        [[t("A")], [t("B")]],
        [[t("1")], [t("2")]],
      ],
    },
    { type: "pageLink", articleId: "p2", title: "Other page", slug: "other-page" },
  ],
};

describe("Tiptap <-> canonical mapping", () => {
  it("round-trips every block and inline type", () => {
    expect(tiptapDocToCanonical(canonicalToTiptapDoc(everything))).toEqual(everything);
  });

  it("keeps blocks the editor does not know instead of dropping them", () => {
    const doc = { blocks: [{ type: "futureWidget", payload: { a: 1 } }, { type: "divider" }] } as unknown as BlogCanonicalContent;
    const tiptap = canonicalToTiptapDoc(doc);
    expect(tiptap.content?.[0].type).toBe("unknownBlock");
    expect(tiptapDocToCanonical(tiptap)).toEqual(doc);
  });

  it("splits multi-paragraph quotes into one quote block each and drops trailing empty paragraphs", () => {
    const canonical = tiptapDocToCanonical({
      type: "doc",
      content: [
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }, { type: "paragraph", content: [{ type: "text", text: "b" }] }] },
        { type: "paragraph" },
      ],
    });
    expect(canonical.blocks).toEqual([
      { type: "blockquote", children: [t("a")] },
      { type: "blockquote", children: [t("b")] },
    ]);
  });

  it("normalises mark nesting without losing text", () => {
    const canonical = tiptapDocToCanonical({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x", marks: [{ type: "code" }, { type: "bold" }, { type: "link", attrs: { href: "/y" } }] }],
        },
      ],
    });
    expect(canonical.blocks[0]).toEqual({
      type: "paragraph",
      children: [{ type: "link", href: "/y", children: [{ type: "strong", children: [{ type: "code", children: [t("x")] }] }] }],
    });
  });

  it("represents an empty document as one empty paragraph", () => {
    expect(canonicalToTiptapDoc({ blocks: [] })).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("validateCanonicalDocument", () => {
  it("accepts the full fixture", () => {
    expect(validateCanonicalDocument(everything)).toEqual({ valid: true });
  });

  it("rejects unknown block types, including inside toggles", () => {
    const unknown = { blocks: [{ type: "futureWidget" }] } as unknown as BlogCanonicalContent;
    expect(validateCanonicalDocument(unknown).valid).toBe(false);
    const nested = { blocks: [{ type: "toggle", summary: [], children: [{ type: "futureWidget" }] }] } as unknown as BlogCanonicalContent;
    expect(validateCanonicalDocument(nested).valid).toBe(false);
  });

  it("rejects malformed new blocks", () => {
    expect(validateCanonicalDocument({ blocks: [{ type: "pageLink", articleId: "", title: "" }] } as unknown as BlogCanonicalContent).valid).toBe(false);
    expect(validateCanonicalDocument({ blocks: [{ type: "table", header: false, rows: "x" }] } as unknown as BlogCanonicalContent).valid).toBe(false);
  });
});

describe("canonicalToHtml", () => {
  it("emits markup for every new block", () => {
    const html = canonicalToHtml(everything);
    for (const needle of ["<aside data-callout", "<details>", "data-todo", "<pre><code", "<hr />", "<table>", "data-page-link", "<code>", "<s>", "<u>", 'data-color="blue"', 'data-mention="person"']) {
      expect(html).toContain(needle);
    }
  });
});

describe("BlogPostRenderer", () => {
  const html = renderToStaticMarkup(<BlogPostRenderer content={everything} resolvePageHref={(page) => `/p/${page.slug}`} />);

  it("renders every new block type", () => {
    for (const needle of ['data-block="callout"', 'data-block="toggle"', 'data-block="todo"', 'data-block="code"', 'data-block="divider"', 'data-block="table"', 'data-block="pageLink"']) {
      expect(html).toContain(needle);
    }
    expect(html).toContain("<th");
    expect(html).toContain('href="/p/other-page"');
    expect(html).toContain("ws-bg-orange");
    expect(html).toContain("ws-color-blue");
    expect(html).toContain("@Ada");
  });

  it("shows a visible fallback for unknown blocks, never plain text", () => {
    const unknown = { blocks: [{ type: "futureWidget" }] } as unknown as BlogCanonicalContent;
    const out = renderToStaticMarkup(<BlogPostRenderer content={unknown} />);
    expect(out).toContain('data-unknown-block="futureWidget"');
    expect(out).toContain("Unsupported block type");
  });

  it("ignores unknown colour names instead of emitting arbitrary classes", () => {
    const doc = { blocks: [{ type: "paragraph", children: [{ type: "color", color: "evil", children: [t("x")] }] }] } as unknown as BlogCanonicalContent;
    expect(renderToStaticMarkup(<BlogPostRenderer content={doc} />)).not.toContain("evil");
  });
});

describe("WikiArticleRenderer parity", () => {
  it("renders the same markup for the editor preview (bodyJson) and the published path (stored JSON)", async () => {
    const { default: WikiArticleRenderer } = await import("@/components/admin/WikiArticleRenderer");
    const preview = renderToStaticMarkup(<WikiArticleRenderer bodyJson={everything} />);
    const published = renderToStaticMarkup(<WikiArticleRenderer legacyContent={JSON.stringify(everything)} />);
    expect(published).toBe(preview);
    expect(preview).toContain('data-block="callout"');
  });

  it("covers each new block type in the shared renderer output", async () => {
    const { default: WikiArticleRenderer } = await import("@/components/admin/WikiArticleRenderer");
    for (const block of everything.blocks.filter((candidate) => ["callout", "toggle", "todo", "code", "divider", "table", "pageLink"].includes(candidate.type))) {
      const html = renderToStaticMarkup(<WikiArticleRenderer bodyJson={{ blocks: [block] }} />);
      expect(html).toContain(`data-block="${block.type}"`);
    }
  });
});

describe("nested lists", () => {
  const nested: BlogCanonicalContent = {
    blocks: [
      { type: "list", ordered: false, items: [[t("A")], [t("A1")], [t("A1a")], [t("B")]], depths: [0, 1, 2, 0] },
      {
        type: "todo",
        items: [
          { checked: false, children: [t("Parent")] },
          { checked: true, children: [t("Child")], depth: 1 },
        ],
      },
    ],
  };

  it("round-trips through Tiptap with depths intact", () => {
    const tiptap = canonicalToTiptapDoc(nested);
    expect(tiptap.content?.[0].content?.[0].content?.[1].type).toBe("bulletList");
    expect(tiptapDocToCanonical(tiptap)).toEqual(nested);
  });

  it("clamps impossible depths instead of dropping items", () => {
    const skewed = { blocks: [{ type: "list", ordered: true, items: [[t("x")], [t("y")]], depths: [3, 5] }] } as unknown as BlogCanonicalContent;
    const back = tiptapDocToCanonical(canonicalToTiptapDoc(skewed));
    expect(back.blocks[0]).toMatchObject({ type: "list", items: [[t("x")], [t("y")]], depths: [0, 1] });
  });

  it("renders nested lists as nested markup", () => {
    const html = renderToStaticMarkup(<BlogPostRenderer content={nested} />);
    expect(html).toMatch(/<li[^>]*>.*A1.*<ul[^>]*>.*A1a/s);
    expect(canonicalToHtml(nested)).toContain("<li>A<ul><li>A1<ul><li>A1a</li></ul></li></ul></li>");
  });
});
