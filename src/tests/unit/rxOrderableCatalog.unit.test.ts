import { describe, expect, it } from "vitest";
import { isRxOrderableAddon, isRxOrderableLens } from "@/features/rx-order/hooks/useOrderableCatalog";

// The Rx availability rule. `show_on_website` gates the website store's
// bulk-box channel for labs who surface their own lenses — a different channel
// with a different catalogue. It once gated prescription ordering too, which
// left the Rx form offering 10 of 1,011 active lenses. These tests exist so
// that cannot come back silently.
const lens = (over: Partial<{ is_active: boolean; sell_price: number; base_price: number; show_on_website: boolean }> = {}) => ({
  is_active: true,
  sell_price: 100,
  base_price: 40,
  show_on_website: false,
  ...over,
});

describe("rx orderable lens rule", () => {
  it("offers an active priced lens that is not on the website store", () => {
    expect(isRxOrderableLens(lens({ show_on_website: false }))).toBe(true);
  });

  it("does not care about show_on_website either way", () => {
    expect(isRxOrderableLens(lens({ show_on_website: true })))
      .toBe(isRxOrderableLens(lens({ show_on_website: false })));
  });

  it("excludes inactive lenses", () => {
    expect(isRxOrderableLens(lens({ is_active: false }))).toBe(false);
  });

  it("offers a lens priced only by base price — the pricelist supplies the sell price", () => {
    expect(isRxOrderableLens(lens({ sell_price: 0, base_price: 40 }))).toBe(true);
  });

  it("offers a lens priced only by sell price", () => {
    expect(isRxOrderableLens(lens({ sell_price: 100, base_price: 0 }))).toBe(true);
  });

  it("excludes an unpriced lens", () => {
    expect(isRxOrderableLens(lens({ sell_price: 0, base_price: 0 }))).toBe(false);
  });
});

describe("rx orderable addon rule", () => {
  it("offers an active addon regardless of website visibility", () => {
    expect(isRxOrderableAddon({ is_active: true })).toBe(true);
  });

  it("excludes an inactive addon", () => {
    expect(isRxOrderableAddon({ is_active: false })).toBe(false);
  });
});
