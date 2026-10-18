import { describe, expect, it } from "vitest";
import { pricelistCurrencies, convertPricelistAmount, formatPricelistMoney } from "@/components/account/pricelistCurrencies";

const options = pricelistCurrencies([
  { currencyCode: "BBD", bbdPerUnit: 1, isDefault: false },
  { currencyCode: "USD", bbdPerUnit: 2, isDefault: true },
  { currencyCode: "EUR", bbdPerUnit: 2.4, isDefault: false },
  { currencyCode: "XCD", bbdPerUnit: 2 / 2.7, isDefault: false },
]);

describe("pricelist display currencies", () => {
  it("offers EUR and XCD as labelled estimates when absent from settings", () => {
    const result = pricelistCurrencies(options.slice(0, 2));
    expect(result.map((item) => item.currencyCode)).toEqual(["BBD", "USD", "EUR", "XCD"]);
    expect(result.find((item) => item.currencyCode === "EUR")?.indicative).toBe(true);
    expect(result.find((item) => item.currencyCode === "XCD")?.indicative).toBe(true);
  });
  it("prefers configured rates and preserves the default", () => {
    expect(options.find((item) => item.currencyCode === "EUR")).toEqual({ currencyCode: "EUR", bbdPerUnit: 2.4, isDefault: false });
    expect(options.find((item) => item.isDefault)?.currencyCode).toBe("USD");
  });
  it("converts through BBD in the correct direction", () => {
    expect(convertPricelistAmount(240, "BBD", "EUR", options)).toBe(100);
    expect(convertPricelistAmount(100, "USD", "XCD", options)).toBeCloseTo(270);
    expect(convertPricelistAmount(100, "EUR", "BBD", options)).toBe(240);
    expect(convertPricelistAmount(125, "EUR", "EUR", options)).toBe(125);
    expect(convertPricelistAmount(125, "UNKNOWN", "EUR", options)).toBeNull();
  });
  it("formats euros and dollars with their appropriate symbols", () => {
    expect(formatPricelistMoney(100, "EUR")).toBe("€100.00");
    expect(formatPricelistMoney(100, "USD")).toBe("$100.00");
    expect(formatPricelistMoney(100, "XCD")).toContain("100.00");
    expect(formatPricelistMoney(100, "EUR")).not.toContain("$");
  });
});
