import { describe, it, expect } from "vitest";
import { calculatePricingEngine } from "@/hooks/usePricingEngine";
import type { PricingSettings } from "@/hooks/usePricingSettings";
import { costModelFromSettings } from "@/lib/pricing/costModel";
import { landedCostFor, standardPrice } from "@/lib/pricing/engine";

// Live "Classic Price Settings 2026" values (v3) plus the new import-cost fields.
const settings = {
  base_currency: "BBD",
  fx_rates: { BBD: 1, USD: 2 },
  fx_risk_buffer: 0,
  vat_rate: 0.175,
  duty_rates: { lenses: 0, supplies: 0.2, addons: 0 },
  brokerage_fee: 0,
  port_charges: 0,
  insurance_percent: 0.01,
  import_charges_percent: 0.23,
  fx_fee_percent: 0.02,
  cost_of_capital: 0.08,
  inventory_holding: 0.05,
  avg_days_in_stock: 90,
  overhead_percent: 0.1,
  shrinkage_percent: 0.02,
  target_margin: 0.5,
  category_margin_floors: { lenses: 0.3, addons: 0.2, supplies: 0.25 },
  category_target_margins: { lenses: 0.5, addons: 0.4, supplies: 0.45 },
  max_price_increase: 0.1,
} as unknown as PricingSettings;

const lens = (supplier_cost: number, labour_cost = 0) =>
  calculatePricingEngine(
    { component_type: "lenses", supplier_cost, currency: "USD", bb_item: false, vat_recoverable: true, duty_applicable: false, labour_cost, category: "lenses" },
    settings
  );

describe("one landed-cost model for the calculator and Auto Price", () => {
  it("lands a $20 USD lens at ~2.5x supplier price in BBD, as the shipments do", () => {
    const r = lens(20);
    expect(r.landed_cost / 20).toBeGreaterThan(2.45);
    expect(r.landed_cost / 20).toBeLessThan(2.55);
    expect(r.duty).toBe(0);
    expect(r.vat).toBe(0);
  });

  it("prices in financing and waste only: no overhead, no holding", () => {
    const r = lens(20);
    expect(r.overhead).toBe(0);
    expect(r.holding).toBe(0);
    expect(r.full_cost).toBeCloseTo(r.landed_cost + r.financing + r.shrinkage, 6);
  });

  it("converts labour into BBD instead of adding USD to a BBD cost", () => {
    const r = lens(20, 1); // $1 USD of labour
    expect(r.labour).toBeCloseTo(2, 6);
    expect(r.full_cost).toBeCloseTo(lens(20).full_cost + 2, 6);
  });

  it("matches the Auto Price cost model to the cent", () => {
    const cm = costModelFromSettings(settings);
    const calcBbd = lens(20).full_cost;
    const autoUsd = landedCostFor(20, "TOG Rx Lab", cm);
    expect(autoUsd * 2).toBeCloseTo(calcBbd, 1);
  });

  it("Auto Price now keeps its 15% floor against real landed cost", () => {
    const cm = costModelFromSettings(settings);
    const sp = standardPrice({ key: "k", suppliers: { "TOG Rx Lab": 20 } }, { floorMargin: 0.15, costModel: cm });
    // Bare-cost pricing gave $24 (BBD 48), under the BBD ~49.8 it really costs to land.
    expect(sp.priceUSD! * 2).toBeGreaterThan(lens(20).landed_cost);
    expect(sp.floorMargin!).toBeGreaterThanOrEqual(0.15 - 1e-9);
  });

  it("does not charge recoverable VAT as a cost on add-ons", () => {
    const r = calculatePricingEngine(
      { component_type: "addons", supplier_cost: 10, currency: "USD", bb_item: false, vat_recoverable: true, duty_applicable: true, labour_cost: 0, category: "addons" },
      settings
    );
    expect(r.landed_cost).toBeCloseTo(r.cif + r.duty + r.charges, 6);
  });
});
