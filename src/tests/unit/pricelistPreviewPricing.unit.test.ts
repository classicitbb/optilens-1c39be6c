import { describe, expect, it } from "vitest";

import { resolveCatalogRowPreviewPriceBbd } from "@/lib/pricelistPreviewPricing";
import type { LineOverride } from "@/hooks/usePriceHierarchy";

describe("resolveCatalogRowPreviewPriceBbd", () => {
  it("returns the row price when no matching override exists", () => {
    const result = resolveCatalogRowPreviewPriceBbd(
      { bbd_price: 30, row_type: "lens", item_id: "lens-1" },
      []
    );

    expect(result).toBe(30);
  });

  it("uses matching line override for linked row items", () => {
    const overrides: LineOverride[] = [
      {
        reference_type: "lens",
        reference_id: "lens-1",
        overridden_price_bbd: 42.5,
        reason: "promo",
        child_section_id: 12,
      },
    ];

    const result = resolveCatalogRowPreviewPriceBbd(
      { bbd_price: 30, row_type: "lens", item_id: "lens-1" },
      overrides
    );

    expect(result).toBe(42.5);
  });

  it("ignores overrides when item type differs", () => {
    const overrides: LineOverride[] = [
      {
        reference_type: "supply",
        reference_id: "lens-1",
        overridden_price_bbd: 50,
        reason: null,
        child_section_id: 8,
      },
    ];

    const result = resolveCatalogRowPreviewPriceBbd(
      { bbd_price: 30, row_type: "lens", item_id: "lens-1" },
      overrides
    );

    expect(result).toBe(30);
  });
});
