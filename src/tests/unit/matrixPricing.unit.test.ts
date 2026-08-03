import { describe, expect, it } from "vitest";
import {
  buildPriceLookup,
  categoryKeyFor,
  cellForAlias,
  materialIndexFor,
  priceForAlias,
  treatmentKeyFor,
  treatmentLookupKeys,
} from "@/features/rx-order/pricing/matrixPricing";

const alias = (over: Partial<Parameters<typeof cellForAlias>[0]> = {}) => ({
  color_description: "TGNS Amber",
  mf_type: "Single Vision",
  style_description: "Regular",
  pricing_key: "Plastic 1.50 | Single Vision | Regular",
  ...over,
});

describe("material index", () => {
  it("names Poly and Trivex rather than numbering them", () => {
    expect(materialIndexFor("Poly")).toBe("POLY");
    expect(materialIndexFor("Poly 1.59")).toBe("POLY");
    expect(materialIndexFor("Trivex 1.53")).toBe("Trivex");
  });

  it("does not let Trivex's 1.53 be read as an index", () => {
    // 1.53 is not a matrix column; a numeric-first rule would return null or
    // worse, and silently drop every Trivex line out of pricing.
    expect(materialIndexFor("Trivex 1.53")).not.toBe("1.53");
  });

  it("reads the index out of the numbered materials", () => {
    expect(materialIndexFor("Plastic 1.50")).toBe("1.50");
    expect(materialIndexFor("Photochromic 1.50")).toBe("1.50");
    expect(materialIndexFor("Polarized 1.50")).toBe("1.50");
    expect(materialIndexFor("1.60 High Index")).toBe("1.60");
    expect(materialIndexFor("1.67 High Index")).toBe("1.67");
    expect(materialIndexFor("1.74 High Index")).toBe("1.74");
  });

  it("returns null for a material the matrix has no column for", () => {
    expect(materialIndexFor("Plastic 1.565")).toBeNull();
    expect(materialIndexFor("")).toBeNull();
    expect(materialIndexFor(null)).toBeNull();
  });
});

describe("treatment from the colour text", () => {
  it("maps the TGNS naming variants onto one group", () => {
    expect(treatmentKeyFor("TGNS Amber")).toBe("transitions_gen_s");
    expect(treatmentKeyFor("Trans 8 Gray")).toBe("transitions_gen_s");
    expect(treatmentKeyFor("Gray 8 SRC")).toBe("transitions_gen_s");
  });

  it("separates the XtrActive variants", () => {
    expect(treatmentKeyFor("XtrActive PolarGry")).toBe("transitions_xtractive_polarized");
    expect(treatmentKeyFor("XtrActive Gray")).toBe("transitions_xtractive_new_generation");
  });

  it("treats an uncoated or hard-coated lens as clear", () => {
    expect(treatmentKeyFor("UNCoated")).toBe("clear");
    expect(treatmentKeyFor("SRCoated")).toBe("clear");
  });

  it("falls back to clear rather than throwing on an unknown colour", () => {
    expect(treatmentKeyFor("Something Nobody Has Seen")).toBe("clear");
  });
});

describe("category from mf type and style", () => {
  it("classifies the Innovations style names directly", () => {
    expect(categoryKeyFor("Progressive", "Endless Steady")).toBe("progressive_best");
    expect(categoryKeyFor("Progressive", "Essential Steady")).toBe("progressive_better");
    expect(categoryKeyFor("Single Vision", "Regular")).toBe("single_vision_regular");
  });

  it("bundles trifocal in with bifocal", () => {
    expect(categoryKeyFor("Trifocal", "Flat Top 7x28")).toBe("specific_use_bifocal_ft");
    expect(categoryKeyFor("Trifocal", "Flat Top 7x28"))
      .toBe(categoryKeyFor("Bifocal", "Flat Top 28"));
  });

  it("returns null for a style the tier map does not know", () => {
    expect(categoryKeyFor("Progressive", "Not A Real Design")).toBeNull();
  });
});

describe("cell resolution", () => {
  it("resolves all three axes from the alias alone", () => {
    expect(cellForAlias(alias())).toEqual({
      treatment: "transitions_gen_s",
      category: "single_vision_regular",
      materialIndex: "1.50",
    });
  });

  it("returns null when the material has no matrix column", () => {
    expect(cellForAlias(alias({ pricing_key: "Plastic 1.565 | Single Vision | Regular" }))).toBeNull();
  });

  it("returns null when the style is unclassifiable", () => {
    expect(cellForAlias(alias({ style_description: "Not A Real Design" }))).toBeNull();
  });
});

describe("price lookup", () => {
  const allocations = [
    { treatment_type: "transitions_gen_s", category: "single_vision_regular", material_index: "1.50", allocated_price_bbd: 120 },
    { treatment_type: "clear", category: "single_vision_regular", material_index: "1.50", allocated_price_bbd: 40 },
    { treatment_type: "polarized", category: "single_vision_regular", material_index: "1.50", allocated_price_bbd: null },
  ];

  it("prices an alias through its cell", () => {
    expect(priceForAlias(alias(), buildPriceLookup(allocations))).toBe(120);
  });

  it("treats a null-priced allocation as unpriced, same as an absent one", () => {
    const lookup = buildPriceLookup(allocations);
    expect(priceForAlias(alias({ color_description: "Polar Gray-C" }), lookup)).toBeNull();
    expect(priceForAlias(alias({ color_description: "XtrActive Gray" }), lookup)).toBeNull();
  });

  it("is not shadowed by the zero-priced deprecated Trans Gen S duplicates", () => {
    // Live data carries 257 unpriced rows under trans_gen_s / transitions_gen_s_2.
    // The real key must still win.
    const withDuplicates = [
      { treatment_type: "trans_gen_s", category: "single_vision_regular", material_index: "1.50", allocated_price_bbd: null },
      { treatment_type: "transitions_gen_s_2", category: "single_vision_regular", material_index: "1.50", allocated_price_bbd: null },
      ...allocations,
    ];
    expect(priceForAlias(alias(), buildPriceLookup(withDuplicates))).toBe(120);
  });

  it("still finds a price recorded under a deprecated key", () => {
    const onlyDeprecated = [
      { treatment_type: "trans_gen_s", category: "single_vision_regular", material_index: "1.50", allocated_price_bbd: 99 },
    ];
    expect(priceForAlias(alias(), buildPriceLookup(onlyDeprecated))).toBe(99);
  });

  it("lists the deprecated keys only for the group that has them", () => {
    expect(treatmentLookupKeys("transitions_gen_s")).toHaveLength(3);
    expect(treatmentLookupKeys("clear")).toEqual(["clear"]);
  });
});
