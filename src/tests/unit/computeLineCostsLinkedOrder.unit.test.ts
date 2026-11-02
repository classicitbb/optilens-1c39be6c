import { describe, expect, it } from "vitest";
import { computeLineCosts } from "@/hooks/useShipments";

describe("computeLineCosts with a linked Innovations order", () => {
  const base = { line_fob_foreign: 200, quantity: 2, markup_percent: 30 };

  it("uses the markup input when no order is linked", () => {
    const c = computeLineCosts({ ...base, linked_sell_total_bbd: null }, 2.0277, 2.4613);
    expect(c.linked).toBe(false);
    expect(c.markupPercent).toBe(30);
    expect(c.sellBbd).toBeCloseTo(c.landedUnitBbd * 1.3, 6);
  });

  it("takes sell per unit from the order total and derives markup from landed cost", () => {
    const c = computeLineCosts({ ...base, linked_sell_total_bbd: 1297.58 }, 2.0277, 2.4613);
    expect(c.linked).toBe(true);
    expect(c.sellBbd).toBeCloseTo(648.79, 2);
    expect(c.markupPercent).toBeCloseTo((648.79 / c.landedUnitBbd - 1) * 100, 2);
  });
});
