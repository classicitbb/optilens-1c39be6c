import { describe, expect, it } from "vitest";
import { materializedPrice, needsMaterializedOverride } from "@/lib/pricing/materializeAdjustments";

describe("materialized pricelist adjustments", () => {
  it("applies master markup to the Auto Price baseline", () => {
    expect(materializedPrice(100, { markup: 10, discount: 0 }, { markup: 0, discount: 0 })).toBe(110);
  });

  it("applies a child discount only to its section baseline", () => {
    expect(materializedPrice(100, { markup: 0, discount: 0 }, { markup: 0, discount: 15 })).toBe(85);
  });

  it("compounds master and child adjustments once and rounds BBD to cents", () => {
    expect(materializedPrice(19.99, { markup: 10, discount: 0 }, { markup: 0, discount: 5 })).toBe(20.89);
  });

  it("uses the baseline rather than a prior override and removes no-op overrides", () => {
    const adjusted = materializedPrice(100, { markup: 10, discount: 0 }, { markup: 0, discount: 0 });
    expect(adjusted).toBe(110);
    expect(needsMaterializedOverride(100, adjusted)).toBe(true);
    expect(needsMaterializedOverride(100, materializedPrice(100, { markup: 0, discount: 0 }, { markup: 0, discount: 0 }))).toBe(false);
  });
});
