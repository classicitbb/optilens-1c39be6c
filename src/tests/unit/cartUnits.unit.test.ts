import { describe, expect, it } from "vitest";
import { getCartItemUnit, normalizeCartAddition } from "@/lib/cartUnits";

describe("cart lens units", () => {
  it("turns a pair-priced stock lens into two eaches without changing its line total", () => {
    const item = normalizeCartAddition({
      productType: "lens" as const,
      price: 62,
      quantity: 20,
      priceUnit: "pair" as const,
    });

    expect(item.price).toBe(31);
    expect(item.quantity).toBe(40);
    expect(item.price * item.quantity).toBe(1240);
    expect(getCartItemUnit(item.productType, item.variantMetadata)).toBe("each");
  });

  it("keeps an Rx job total as one job", () => {
    const item = normalizeCartAddition({
      productType: "lens" as const,
      price: 195.3,
      priceUnit: "job" as const,
      variantMetadata: { kind: "rx_order" },
    });

    expect(item.price).toBe(195.3);
    expect(item.quantity).toBe(1);
    expect(getCartItemUnit(item.productType, item.variantMetadata)).toBe("job");
  });

  it("retains the legacy pair label until a stored cart row is migrated", () => {
    expect(getCartItemUnit("lens", {})).toBe("pair");
    expect(getCartItemUnit("supply", {})).toBe("unit");
  });
});
