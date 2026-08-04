import { describe, expect, it } from "vitest";
import {
  buildEngineCurrencies,
  engineRateFor,
  INDICATIVE_BBD_PER_UNIT,
  isTransactional,
  TRANSACTIONAL_CURRENCIES,
} from "@/features/rx-order/pricing/currencies";

// The whole point of this module is one direction change. pricing_settings
// stores BBD per unit of foreign (USD: 2); the engine wants foreign per BBD
// (USD: 0.5). Getting it backwards is a 4× error on every USD quote that still
// produces a believable-looking number, so it is pinned hard here.
describe("the rate inversion", () => {
  it("turns BBD-per-unit into foreign-per-BBD", () => {
    // 1 USD = 2 BBD, so 1 BBD = 0.5 USD.
    expect(engineRateFor(2)).toBe(0.5);
  });

  it("leaves the base currency alone", () => {
    expect(engineRateFor(1)).toBe(1);
  });

  it("is its own inverse — applying it twice returns the original", () => {
    expect(engineRateFor(engineRateFor(2)!)).toBe(2);
  });

  it("refuses a rate it cannot invert rather than returning Infinity", () => {
    expect(engineRateFor(0)).toBeNull();
    expect(engineRateFor(-1)).toBeNull();
    expect(engineRateFor(null)).toBeNull();
    expect(engineRateFor(undefined)).toBeNull();
    expect(engineRateFor(Number.NaN)).toBeNull();
  });
});

describe("engine currency table", () => {
  const settings = { BBD: 1, USD: 2 };

  it("prices a BBD amount into USD at half, not double", () => {
    const cur = buildEngineCurrencies(settings);
    // 278.25 BBD is the live matrix price for a 1.50 progressive-best clear lens.
    expect(278.25 * cur.USD.rate).toBeCloseTo(139.125, 3);
    expect(278.25 * cur.BBD.rate).toBe(278.25);
  });

  it("marks only BBD and USD as transactional", () => {
    const cur = buildEngineCurrencies(settings);
    expect(cur.BBD.indicative).toBeUndefined();
    expect(cur.USD.indicative).toBeUndefined();
    for (const code of Object.keys(INDICATIVE_BBD_PER_UNIT)) {
      expect(cur[code].indicative).toBe(true);
      expect(isTransactional(code)).toBe(false);
    }
    expect(TRANSACTIONAL_CURRENCIES).toEqual(["BBD", "USD"]);
  });

  it("labels the indicative currencies so they cannot be mistaken for firm", () => {
    const cur = buildEngineCurrencies(settings);
    expect(cur.EUR.n).toMatch(/indicative/i);
    expect(cur.USD.n).not.toMatch(/indicative/i);
  });

  it("drops a transactional currency the settings have no rate for", () => {
    // Better to offer one currency correctly than two where one is invented.
    const cur = buildEngineCurrencies({ BBD: 1 });
    expect(cur.BBD).toBeDefined();
    expect(cur.USD).toBeUndefined();
  });

  it("survives missing settings without inventing a base rate", () => {
    expect(buildEngineCurrencies(null).BBD).toBeUndefined();
    expect(buildEngineCurrencies(undefined).USD).toBeUndefined();
    // The indicative ones do not depend on settings and still appear.
    expect(buildEngineCurrencies(null).EUR).toBeDefined();
  });

  it("does not apply a risk buffer — that pads cost, not a sell price", () => {
    // A 2% buffer would give 0.49, and every foreign quote would be 2% high.
    expect(buildEngineCurrencies(settings).USD.rate).toBe(0.5);
  });
});
