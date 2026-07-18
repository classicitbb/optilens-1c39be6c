import { describe, expect, it } from "vitest";
import {
  anchorOf,
  evaluateOverride,
  landedCostFor,
  retailFrom,
  smoothLadder,
  standardPrice,
  type Combo,
} from "@/lib/pricing/engine";

// Ported from C:\DEV\pricelist-automation\pricing-engine.test.js (BS1-05).
// All fixtures must pass identically to the original.

// A combo where SkyLab (least desired) is the most expensive — the classic trap.
const combo: Combo = {
  key: "Clear||Progressive - Best||1.50",
  treatment: "Clear",
  tier: "Progressive - Best",
  material: "1.50",
  suppliers: { "TOG Rx Lab": 18.86, "Vision Rx Lab": 24.0, "Optex Laboratories": 28.95, SkyLab: 58.8 },
};

describe("pricing engine: anchor/floor", () => {
  it("anchor is the most expensive available (SkyLab)", () => {
    const a = anchorOf(combo, []);
    expect(a?.supplier).toBe("SkyLab");
    expect(a?.cost).toBeCloseTo(58.8, 6);
  });

  it("standard price clears the anchor at floor margin and is safe for every supplier", () => {
    const sp = standardPrice(combo, { floorMargin: 0.15, rounding: 0.5 });
    expect(sp.priceUSD!).toBeGreaterThanOrEqual(58.8 / (1 - 0.15) - 1e-9);
    expect(sp.floorMargin!).toBeGreaterThanOrEqual(0.15 - 1e-9);
    expect(sp.safe).toBe(true);
    expect(sp.minMarginAcrossSuppliers!).toBeGreaterThanOrEqual(0.15 - 1e-9);
  });

  it("preferred source follows priority (TOG) and earns a fatter margin", () => {
    const sp = standardPrice(combo, { floorMargin: 0.15, rounding: 0.5 });
    expect(sp.preferredSupplier).toBe("TOG Rx Lab");
    expect(sp.preferredMargin!).toBeGreaterThan(sp.floorMargin!);
  });

  it("excluding a lab changes the anchor (exclude SkyLab -> Optex becomes anchor)", () => {
    const sp = standardPrice(combo, { floorMargin: 0.15, rounding: 0.5 });
    const spEx = standardPrice(combo, { excluded: ["SkyLab"], floorMargin: 0.15 });
    expect(spEx.anchorSupplier).toBe("Optex Laboratories");
    expect(spEx.anchorCost).toBeCloseTo(28.95, 6);
    expect(spEx.priceUSD!).toBeLessThan(sp.priceUSD!);
  });

  it("$10 wholesale floor enforced on cheap combos", () => {
    const cheap: Combo = { key: "k", suppliers: { "TOG Rx Lab": 3.0, SkyLab: 5.0 } };
    const spc = standardPrice(cheap, { floorMargin: 0.15, wholesaleFloor: 10 });
    expect(spc.priceUSD!).toBeGreaterThanOrEqual(10);
  });

  it("priority re-rank changes preferred source but not the safe price", () => {
    const sp = standardPrice(combo, { floorMargin: 0.15, rounding: 0.5 });
    const spPrio = standardPrice(combo, {
      priority: ["SkyLab", "Optex Laboratories", "Vision Rx Lab", "TOG Rx Lab"],
    });
    expect(spPrio.preferredSupplier).toBe("SkyLab");
    expect(spPrio.priceUSD).toBe(sp.priceUSD);
  });

  it("single-source combo anchors on the only lab", () => {
    const single: Combo = { key: "s", suppliers: { "Optex Laboratories": 40 } };
    const sps = standardPrice(single, { floorMargin: 0.15 });
    expect(sps.anchorSupplier).toBe("Optex Laboratories");
    expect(sps.supplierCount).toBe(1);
  });
});

describe("pricing engine: manual override confirmation flow", () => {
  it("override above floor needs no confirmation", () => {
    const ovOk = evaluateOverride(combo, 80, { minMargin: 0.15 });
    expect(ovOk.ok).toBe(true);
    expect(ovOk.needsConfirmation).toBe(false);
  });

  it("low override flags for confirmation and proposes cheapest acceptable lab", () => {
    const ovLow = evaluateOverride(combo, 30, { minMargin: 0.15 });
    expect(ovLow.ok).toBe(false);
    expect(ovLow.needsConfirmation).toBe(true);
    expect(ovLow.constraint?.supplier).toBe("TOG Rx Lab");
  });

  it("impossible override is reported as a loss with no acceptable supplier", () => {
    const ovLoss = evaluateOverride(combo, 19, { minMargin: 0.15 });
    expect(ovLoss.ok).toBe(false);
    expect(ovLoss.needsConfirmation).toBe(false);
    expect(ovLoss.constraint).toBeNull();
  });
});

describe("pricing engine: retail and smoothing", () => {
  it("retail +100% doubles wholesale", () => {
    expect(retailFrom(50, { type: "pct", value: 100 })).toBe(100);
  });

  it("retail flat markup adds value", () => {
    expect(retailFrom(50, { type: "flat", value: 15 })).toBe(65);
  });

  it("smoothing prevents a better lens being cheaper than a lesser one", () => {
    const smoothed = smoothLadder([
      { key: "good", priceUSD: 40 },
      { key: "better", priceUSD: 35 },
      { key: "best", priceUSD: 60 },
    ]);
    expect(smoothed[1].priceUSD!).toBeGreaterThanOrEqual(smoothed[0].priceUSD!);
  });
});

describe("pricing engine: landed cost (§2.7)", () => {
  it("null costModel: landed == supplier price", () => {
    expect(landedCostFor(20, "TOG Rx Lab", null)).toBe(20);
  });

  it("applies per-supplier freight", () => {
    const cmF = { freightPct: { default: 0.1, SkyLab: 0.2 } };
    expect(landedCostFor(20, "TOG Rx Lab", cmF)).toBeCloseTo(22, 6);
    expect(landedCostFor(50, "SkyLab", cmF)).toBeCloseTo(60, 6);
  });

  it("full landed model: 20 -> 23.8", () => {
    // 20*1.12=22.4 ; *(1.04)=23.296 ; +0.5 = 23.8
    const cmFull = { freightPct: { default: 0.12 }, dutyPct: 0, leviesPct: 0.01, clearancePct: 0.03, brokeragePerPair: 0.5 };
    expect(landedCostFor(20, "TOG Rx Lab", cmFull)).toBeCloseTo(23.8, 6);
  });

  it("standardPrice anchors on LANDED cost, stays safe, and preserves raw prices", () => {
    const cmFull = { freightPct: { default: 0.12 }, dutyPct: 0, leviesPct: 0.01, clearancePct: 0.03, brokeragePerPair: 0.5 };
    const lcCombo: Combo = { key: "k", suppliers: { "TOG Rx Lab": 20, SkyLab: 50 } };
    const spLanded = standardPrice(lcCombo, { floorMargin: 0.15, costModel: cmFull });
    const spRaw = standardPrice(lcCombo, { floorMargin: 0.15, costModel: null });
    expect(spLanded.anchorSupplier).toBe("SkyLab");
    expect(spLanded.floorMargin!).toBeGreaterThanOrEqual(0.15 - 1e-6);
    expect(spLanded.anchorSupplierPrice).toBe(50);
    expect(spLanded.preferredSupplierPrice).toBe(20);
    expect(spLanded.priceUSD!).toBeGreaterThan(spRaw.priceUSD!);
  });
});
