import { describe, expect, it } from "vitest";
import type { ContentArticle } from "@/hooks/useContentArticles";
import {
  buildPublicHelpCenterTree,
  composeHelpEntrySummary,
  extractCanonicalHeadings,
  parseHelpEntrySummary,
} from "@/lib/helpCenter";

const createContentArticle = (overrides: Partial<ContentArticle> = {}): ContentArticle => ({
  id: "article-1",
  title: "Guide to AR Coatings",
  content: "<h1>Guide to AR Coatings</h1><h2>Benefits</h2>",
  description: "Understand anti-reflective coatings.",
  summary: "Understand anti-reflective coatings.",
  page_slug: "how-ar-coating-works",
  category: "coatings-and-care",
  content_type: "knowledge",
  visibility: "public",
  slug: "guide-to-ar-coatings",
  parent_id: null,
  section_id: null,
  context_slugs: ["knowledge/wiki"],
  sort_order: 1,
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  status: "published",
  ...overrides,
});

describe("helpCenter", () => {
  it("parses and composes linked help entry summaries", () => {
    const summary = composeHelpEntrySummary({
      kind: "link",
      href: "/patients/progressive-lenses",
      summary: "Use the patient guide for this topic.",
    });

    expect(summary).toBe("[link:/patients/progressive-lenses] Use the patient guide for this topic.");
    expect(parseHelpEntrySummary(summary)).toEqual({
      kind: "link",
      href: "/patients/progressive-lenses",
      summary: "Use the patient guide for this topic.",
    });
  });

  it("projects public articles into article and link nodes", () => {
    const tree = buildPublicHelpCenterTree([
      createContentArticle(),
      createContentArticle({
        id: "article-2",
        title: "Progressive lens options",
        slug: "progressive-lens-options",
        summary: "[link:/patients/progressive-lenses] Learn more about progressive lenses.",
        category: "patient-support",
      }),
    ]);

    expect(tree.nodeBySlug.get("guide-to-ar-coatings")?.kind).toBe("article");
    expect(tree.nodeBySlug.get("progressive-lens-options")).toMatchObject({
      kind: "link",
      href: "/patients/progressive-lenses",
    });
  });

  it("extracts table-of-contents headings from canonical content", () => {
    const headings = extractCanonicalHeadings({
      blocks: [
        {
          type: "heading",
          level: 1,
          children: [{ type: "text", text: "Overview" }],
        },
        {
          type: "paragraph",
          children: [{ type: "text", text: "Body copy" }],
        },
        {
          type: "heading",
          level: 2,
          children: [{ type: "text", text: "FAQs" }],
        },
      ],
    });

    expect(headings).toEqual([
      { id: "overview", text: "Overview", level: 1 },
      { id: "faqs", text: "FAQs", level: 2 },
    ]);
  });
});
