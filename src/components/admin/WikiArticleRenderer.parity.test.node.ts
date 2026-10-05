import test from "node:test";
import assert from "node:assert/strict";

import { toWikiRendererDocument } from "./WikiArticleRenderer";
import { canonicalToHtml, toCanonicalDocument } from "../../lib/wikiCanonical";

const normalize = (html: string) => html.replace(/\s+/g, " ").trim();

test("wiki renderer parity: preview and published contexts render equivalent output", () => {
  const source = "# Heading\n\nA **bold** line with [a link](https://example.com).\n\n- One\n- Two";
  const canonical = toCanonicalDocument(source);

  const previewDoc = toWikiRendererDocument({ bodyJson: canonical, legacyContent: source });
  const publishedDoc = toWikiRendererDocument({ legacyContent: source });

  assert.equal(normalize(canonicalToHtml(previewDoc)), normalize(canonicalToHtml(publishedDoc)));
});

test("wiki renderer contract fallback: invalid payload resolves to empty canonical document", () => {
  const resolved = toWikiRendererDocument({ bodyJson: null, legacyContent: "" });
  assert.deepEqual(resolved, { blocks: [] });
});

test("wiki renderer parity: every workspace block renders the same in preview and published contexts", () => {
  const t = (text: string) => ({ type: "text" as const, text });
  const canonical = {
    blocks: [
      { type: "callout" as const, icon: "⚠️", color: "orange" as const, children: [t("Careful")] },
      { type: "toggle" as const, summary: [t("More")], children: [{ type: "paragraph" as const, children: [t("Hidden")] }] },
      { type: "todo" as const, items: [{ checked: true, children: [t("Done")] }, { checked: false, children: [t("Open")] }] },
      { type: "code" as const, language: "ts", text: "const a = 1;" },
      { type: "divider" as const },
      { type: "table" as const, header: true, rows: [[[t("A")], [t("B")]], [[t("1")], [t("2")]]] },
      { type: "pageLink" as const, articleId: "p1", title: "Other page", slug: "other-page" },
      {
        type: "paragraph" as const,
        children: [
          { type: "code" as const, children: [t("x")] },
          { type: "strike" as const, children: [t("y")] },
          { type: "underline" as const, children: [t("z")] },
          { type: "color" as const, color: "blue" as const, children: [t("c")] },
          { type: "mention" as const, kind: "person" as const, label: "Ada" },
        ],
      },
    ],
  };

  const previewDoc = toWikiRendererDocument({ bodyJson: canonical, legacyContent: "" });
  const publishedDoc = toWikiRendererDocument({ legacyContent: JSON.stringify(canonical) });

  assert.equal(normalize(canonicalToHtml(previewDoc)), normalize(canonicalToHtml(publishedDoc)));
  for (const needle of ["data-callout", "<details>", "data-todo", "<pre>", "<hr />", "<table>", "data-page-link", "<s>", "<u>", "data-mention"]) {
    assert.ok(canonicalToHtml(previewDoc).includes(needle), `missing ${needle}`);
  }
});
