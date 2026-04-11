import { describe, expect, it } from "vitest";
import type { ContentArticle } from "@/hooks/useContentArticles";
import type { HelpArticle } from "@/hooks/useHelpArticles";
import type { WikiHeading } from "@/hooks/useWikiHeadings";
import {
  buildAdminHelpCenterTree,
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

const createHelpArticle = (overrides: Partial<HelpArticle> = {}): HelpArticle => ({
  id: "help-1",
  title: "Lens fitting checklist",
  content: "<h1>Lens fitting checklist</h1>",
  body_json: null,
  page_slug: "knowledge/wiki",
  context_slugs: ["knowledge/wiki"],
  category: "professional-resources",
  sort_order: 0,
  is_active: true,
  status: "draft",
  slug: "lens-fitting-checklist",
  summary: "Checklist summary",
  parent_id: null,
  section_id: "heading-1",
  version_number: 1,
  published_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
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

  it("builds the admin tree from headings and parent-child article relationships", () => {
    const headings: WikiHeading[] = [
      { id: "heading-1", title: "Professional Resources", slug: "professional-resources", sort_order: 0 },
    ];

    const parent = createHelpArticle();
    const child = createHelpArticle({
      id: "help-2",
      title: "Dispensing tips",
      slug: "dispensing-tips",
      parent_id: "help-1",
      section_id: "heading-1",
      sort_order: 1,
    });

    const tree = buildAdminHelpCenterTree(headings, [parent, child]);
    const section = tree.sections[0];
    const parentNode = tree.nodeBySlug.get("lens-fitting-checklist");

    expect(section?.title).toBe("Professional Resources");
    expect(section?.children[0]?.id).toBe("help-1");
    expect(parentNode?.children[0]?.slug).toBe("dispensing-tips");
  });

  it("extracts table-of-contents headings from canonical content", () => {
    const headings = extractCanonicalHeadings({
      blocks: [
        {
          type: "heading",
          level: 1,
          children: [{ type: "text", text: "Overview", bold: false, italic: false, underline: false }],
        },
        {
          type: "paragraph",
          children: [{ type: "text", text: "Body copy", bold: false, italic: false, underline: false }],
        },
        {
          type: "heading",
          level: 2,
          children: [{ type: "text", text: "FAQs", bold: false, italic: false, underline: false }],
        },
      ],
    });

    expect(headings).toEqual([
      { id: "overview", text: "Overview", level: 1 },
      { id: "faqs", text: "FAQs", level: 2 },
    ]);
  });
});
