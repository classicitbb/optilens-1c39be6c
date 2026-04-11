import { describe, expect, it } from "vitest";
import { buildAssistantCorpus, runAssistantQuery, shouldAskClarifier } from "@/features/assistant/companionAssistantEngine";

describe("companion assistant engine", () => {
  const corpus = buildAssistantCorpus({
    products: [
      {
        id: "lens-1",
        name: "ZenVue Brilliance Progressive",
        description: "Premium progressive lens for all-day wear.",
        quantity_label: "pair",
        sell_price: 100,
        sell_price_usd: 50,
        is_vat_taxable: true,
        product_type: "lens",
        category: "Progressive",
        subcategory: "Freeform",
        tags: ["premium", "progressive"],
        image_url: null,
        image_urls: [],
        has_variants: false,
      },
    ],
    knowledge: [
      {
        id: "article-1",
        title: "Why Choose Progressive Lenses?",
        content: "Progressive lenses support all-distance vision in a single pair.",
        description: "Patient-friendly progressive lens article.",
        page_slug: "why-choose-progressive-lenses",
        category: "Progressives",
        content_type: "knowledge",
        visibility: "public",
        sort_order: 0,
        is_active: true,
        created_at: "",
        updated_at: "",
        status: "published",
        context_slugs: [],
      },
    ],
  });

  it("returns retailer results first for retailer-intent queries", () => {
    const result = runAssistantQuery({
      query: "Find a retailer in Barbados",
      route: "/find-a-retailer",
      profile: "retailer_help",
      corpus,
    });

    expect(result.intent).toBe("retailer");
    expect(result.topLinks.length).toBeGreaterThan(0);
    expect(result.topLinks[0]?.kind).toBe("retailer");
    expect(result.answer).toContain("website");
  });

  it("returns grounded product guidance for product-intent queries", () => {
    const result = runAssistantQuery({
      query: "Compare progressive lenses",
      route: "/lenses/progressive",
      profile: "general_search",
      corpus,
    });

    expect(result.intent).toBe("product");
    expect(result.topLinks.some((link) => link.title.includes("Progressive"))).toBe(true);
    expect(result.answer.length).toBeGreaterThanOrEqual(120);
    expect(result.answer.length).toBeLessThanOrEqual(200);
    expect(result.answer.toLowerCase()).toContain("progressive");
  });

  it("asks for a clarifier after a repeated unsatisfying query", () => {
    expect(shouldAskClarifier({
      previousNegativeFeedback: true,
      lastQuery: "Find a retailer in Barbados",
      nextQuery: "find a retailer in barbados",
    })).toBe(true);

    expect(shouldAskClarifier({
      previousNegativeFeedback: false,
      lastQuery: "Find a retailer in Barbados",
      nextQuery: "find a retailer in barbados",
    })).toBe(false);
  });
});
