import { describe, expect, it } from "vitest";

import {
  CURATED_KNOWLEDGE_ARTICLES,
  KNOWLEDGE_CATEGORY_META,
  KNOWLEDGE_CATEGORY_ORDER,
  KNOWLEDGE_FEATURED_IDS,
  dedupeKnowledgeListings,
} from "@/data/knowledgeCenter";

describe("knowledge center catalog", () => {
  it("keeps curated article ids unique", () => {
    const ids = CURATED_KNOWLEDGE_ARTICLES.map((article) => article.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the most important public help destinations", () => {
    const hrefs = new Set(CURATED_KNOWLEDGE_ARTICLES.map((article) => article.href));

    expect(hrefs.has("/find-a-retailer")).toBe(true);
    expect(hrefs.has("/patients")).toBe(true);
    expect(hrefs.has("/professionals")).toBe(true);
    expect(hrefs.has("/lenses/lens-types")).toBe(true);
    expect(hrefs.has("/lenses/materials")).toBe(true);
    expect(hrefs.has("/photochromic")).toBe(true);
    expect(hrefs.has("/coatings/ultraclear-ar")).toBe(true);
    expect(hrefs.has("/dispensing-tips")).toBe(true);
    expect(hrefs.has("/professionals/lens-ordering-tips")).toBe(true);
    expect(hrefs.has("/zenvue/compare")).toBe(true);
    expect(hrefs.has("/zenvue/wholesale")).toBe(true);
  });

  it("defines metadata and featured content for the visible category system", () => {
    expect(KNOWLEDGE_CATEGORY_ORDER.length).toBeGreaterThan(0);
    expect(KNOWLEDGE_FEATURED_IDS.length).toBeGreaterThan(0);

    for (const categoryId of KNOWLEDGE_CATEGORY_ORDER) {
      expect(KNOWLEDGE_CATEGORY_META[categoryId]).toBeDefined();
      expect(KNOWLEDGE_CATEGORY_META[categoryId].title.length).toBeGreaterThan(0);
    }
  });

  it("deduplicates article listings by category and title without collapsing distinct categories", () => {
    const entries = [
      { id: "first", categoryId: "lens-guides" as const, title: "Polarized Lenses" },
      { id: "second", categoryId: "lens-guides" as const, title: "Polarized Lenses" },
      { id: "third", categoryId: "coatings-care" as const, title: "Polarized Lenses" },
      { id: "fourth", categoryId: "lens-guides" as const, title: "Photochromic Lenses" },
    ];

    expect(dedupeKnowledgeListings(entries)).toEqual([
      { id: "first", categoryId: "lens-guides", title: "Polarized Lenses" },
      { id: "third", categoryId: "coatings-care", title: "Polarized Lenses" },
      { id: "fourth", categoryId: "lens-guides", title: "Photochromic Lenses" },
    ]);
  });
});
