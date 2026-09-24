import { describe, expect, it } from "vitest";
import type { ContentArticle } from "@/hooks/useContentArticles";
import type { WikiHeading } from "@/hooks/useWikiHeadings";
import { buildSopTree, toSopArticlePath } from "@/lib/helpCenter";

const createWikiArticle = (overrides: Partial<ContentArticle> = {}): ContentArticle => ({
  id: "sop-1",
  title: "Walk-in Card Payments",
  content: "<h2>Steps</h2><p>Take the card.</p>",
  description: "",
  summary: "",
  page_slug: "finance/walk-in-payments",
  category: "",
  content_type: "wiki",
  visibility: "internal",
  slug: null,
  parent_id: null,
  section_id: null,
  context_slugs: [],
  sort_order: 0,
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  status: "published",
  ...overrides,
});

const titlesOf = (tree: ReturnType<typeof buildSopTree>) =>
  tree.sections.flatMap((section) => section.children.map((node) => node.title));

describe("buildSopTree", () => {
  it("only includes published, active, internal wiki articles", () => {
    const tree = buildSopTree([], [
      createWikiArticle({ id: "ok", title: "Published SOP" }),
      createWikiArticle({ id: "draft", title: "Draft SOP", status: "draft" }),
      createWikiArticle({ id: "archived", title: "Archived SOP", status: "archived" }),
      createWikiArticle({ id: "inactive", title: "Inactive SOP", is_active: false }),
      createWikiArticle({ id: "public", title: "Public KB", content_type: "knowledge", visibility: "public" }),
      createWikiArticle({ id: "customer", title: "Customer wiki", visibility: "customer" }),
    ]);

    expect(titlesOf(tree)).toEqual(["Published SOP"]);
  });

  it("groups by wiki heading first, then humanized category, with General last", () => {
    const headings: WikiHeading[] = [{ id: "h-lab", slug: "lab", title: "Lab Floor", sort_order: 1 }];
    const tree = buildSopTree(headings, [
      createWikiArticle({ id: "a", title: "Uncategorized", category: "" }),
      createWikiArticle({ id: "b", title: "Pricing pages", category: "pricing-app" }),
      createWikiArticle({ id: "c", title: "Chemistrie SOP", category: "Optical Production" }),
      createWikiArticle({ id: "d", title: "Tinting", category: "pricing-app", section_id: "h-lab" }),
      createWikiArticle({ id: "e", title: "Admin overview", category: "getting-started" }),
    ]);

    expect(tree.sections.map((section) => section.title)).toEqual([
      "Lab Floor",
      "Getting Started",
      "Optical Production",
      "Pricing",
      "General",
    ]);
    expect(tree.sections[0].children.map((node) => node.title)).toEqual(["Tinting"]);
  });

  it("indexes articles by the same slug the wiki editor uses", () => {
    const tree = buildSopTree([], [
      createWikiArticle({ id: "0d3f9a2b-1111-2222-3333-444455556666", title: "Quotations Lifecycle" }),
      createWikiArticle({ id: "x", title: "RX Lens Prices", slug: "static-rx-lens-prices-guide" }),
    ]);

    expect(tree.nodeBySlug.get("quotations-lifecycle-0d3f9a2b-1")?.title).toBe("Quotations Lifecycle");
    expect(tree.nodeBySlug.get("static-rx-lens-prices-guide")?.title).toBe("RX Lens Prices");
    expect(toSopArticlePath("static-rx-lens-prices-guide")).toBe("/admin/knowledge/sops/static-rx-lens-prices-guide");
  });
});
