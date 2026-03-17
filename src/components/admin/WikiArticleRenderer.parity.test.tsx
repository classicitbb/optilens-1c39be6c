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
