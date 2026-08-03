import { describe, expect, it } from "vitest";
import {
  buildAliasGroups,
  buildAliasIndex,
  diagnoseMissingGroup,
  groupByStyle,
  lensGroupKey,
  lensOption,
  matchLens,
  normColour,
  type MatchableAlias,
  type MatchableLens,
} from "@/features/alias-mapping/aliasMatching";

const alias = (
  aliasCode: string,
  colour: string,
  overrides: Partial<MatchableAlias> = {},
): MatchableAlias => ({
  alias: aliasCode,
  style_code: "02262",
  style_description: "Endless Steady",
  material_description: "Plastic 1.50",
  color_code: aliasCode.slice(-5),
  color_description: colour,
  mf_type: "Progressive",
  pricing_key: "Plastic 1.50 | Progressive | Endless Steady",
  ...overrides,
});

const lens = (option: string, overrides: Partial<MatchableLens> = {}): MatchableLens => ({
  id: "lens-1",
  name: "1.50 LBUC PROG Endless Steady",
  material: { name: "Plastic 1.50" },
  mftype: { name: "Progressive" },
  lenstype: { name: "Endless Steady" },
  lens_lens_options: [{ lens_option_id: "opt-1", lens_option: { name: option } }],
  ...overrides,
});

// The eight TGNS colours the Innovations Lens Aliases screen lists for one
// style — our catalogue sells all of them under the single option "TGNS".
const TGNS = ["Gray", "Brown", "Green", "Amber", "Amethyst", "Emerald", "Sapphire", "Ruby"]
  .map((c, i) => alias(`00002262013${70 + i}`, `TGNS ${c}`));

describe("alias matching", () => {
  it("keys a lens on material, mf type and lens type", () => {
    expect(lensGroupKey(lens("TGNS"))).toBe("plastic 1.50 | progressive | endless steady");
  });

  it("reads the colour from the lens option, not the lens name", () => {
    // The live catalogue has rows whose name says "SR Coated" while the option
    // says "Clear"; the option is the one that is trustworthy.
    const l = lens("Clear", { name: "1.53 LBUC PROG Endless Steady SR Coated" });
    expect(lensOption(l)).toEqual({ name: "Clear", id: "opt-1" });
  });

  it("normalises punctuation and spacing out of colour comparisons", () => {
    expect(normColour("SR Coated")).toBe(normColour("SRCoated"));
    expect(normColour("Polar Gray-C")).toBe("polargrayc");
  });

  describe("exact", () => {
    it("matches a colour equal to the option", () => {
      const groups = buildAliasGroups([alias("0000226200001", "SRCoated"), ...TGNS]);
      const result = matchLens(lens("SRCoated"), groups);

      expect(result.kind).toBe("exact");
      expect(result.proposed.map((a) => a.color_description)).toEqual(["SRCoated"]);
      expect(result.reason).toBe('Option "SRCoated" matches 1 colour exactly.');
    });

    it("prefers an exact hit over the family it would also prefix", () => {
      const groups = buildAliasGroups([alias("0000226200500", "TGNS"), ...TGNS]);
      const result = matchLens(lens("TGNS"), groups);

      expect(result.kind).toBe("exact");
      expect(result.proposed).toHaveLength(1);
    });
  });

  describe("header family", () => {
    it("expands an option header to every colour beneath it", () => {
      const groups = buildAliasGroups([...TGNS, alias("0000226200001", "SRCoated")]);
      const result = matchLens(lens("TGNS"), groups);

      expect(result.kind).toBe("family");
      expect(result.proposed).toHaveLength(8);
      expect(result.proposed.map((a) => a.color_description)).toContain("TGNS Amethyst");
      expect(result.proposed.map((a) => a.color_description)).not.toContain("SRCoated");
      expect(result.reason).toBe('Option "TGNS" is the header for 8 colours.');
    });

    it("expands a header whose colours only differ by spacing", () => {
      const groups = buildAliasGroups([
        alias("0000226200400", "Blue Block SRC"),
        alias("0000226200401", "Blue Block UNC"),
        alias("0000226200001", "SRCoated"),
      ]);
      const result = matchLens(lens("Blue Block"), groups);

      expect(result.kind).toBe("family");
      expect(result.proposed).toHaveLength(2);
    });
  });

  describe("synonyms", () => {
    it("maps our Clear to their UNCoated", () => {
      const groups = buildAliasGroups([alias("0000226200000", "UNCoated"), alias("0000226200001", "SRCoated")]);
      const result = matchLens(lens("Clear"), groups);

      expect(result.kind).toBe("synonym");
      expect(result.proposed.map((a) => a.color_description)).toEqual(["UNCoated"]);
      expect(result.reason).toBe('Option "Clear" is our name for 1 colour.');
    });

    it("maps Polarized onto the Polar family", () => {
      const groups = buildAliasGroups([
        alias("0000226200200", "Polar Gray-C"),
        alias("0000226200201", "Polar Brown-C"),
        alias("0000226200001", "SRCoated"),
      ]);
      const result = matchLens(lens("Polarized"), groups);

      expect(result.kind).toBe("synonym");
      expect(result.proposed).toHaveLength(2);
    });

    it("bridges the spelling drift between the two catalogues", () => {
      // We write "XtrActive NG"; Innovations writes "XtrActvNG" — close enough
      // to read past, far enough that a prefix test alone will not join them.
      const groups = buildAliasGroups([
        alias("0010226200100", "XtrActvNG Gray"),
        alias("0010226200101", "XtrActvNG Brown"),
        alias("0010226200102", "XtrActvNG Green"),
      ]);
      const result = matchLens(lens("XtrActive NG"), groups);

      expect(result.kind).toBe("synonym");
      expect(result.proposed).toHaveLength(3);
    });

    it("maps Photochromic across the several brand names it covers", () => {
      const groups = buildAliasGroups([
        alias("0000226200300", "Photo Gray"),
        alias("0000226200301", "Trans 8 Gray"),
        alias("0000226200302", "SunSync Elite Gry"),
        alias("0000226200303", "Vantage Gray"),
        alias("0000226200001", "SRCoated"),
      ]);
      const result = matchLens(lens("Photochromic"), groups);

      expect(result.kind).toBe("synonym");
      expect(result.proposed).toHaveLength(4);
    });
  });

  describe("sub-designs", () => {
    it("includes every style code the header covers", () => {
      // "Endless Steady" spans style codes 02262 and 02285 in the live data.
      const groups = buildAliasGroups([
        alias("0000226200001", "SRCoated"),
        alias("0000228500001", "SRCoated", { style_code: "02285" }),
      ]);
      const result = matchLens(lens("SRCoated"), groups);

      expect(result.proposed).toHaveLength(2);
      expect(result.styleCodes).toEqual(["02262", "02285"]);
      expect(result.reason).toBe('Option "SRCoated" matches 2 colours exactly across 2 sub-designs.');
    });

    it("splits a group into its sub-designs for display", () => {
      const split = groupByStyle([
        alias("0000228500001", "SRCoated", { style_code: "02285", style_description: "Endless Steady" }),
        alias("0000226200001", "SRCoated"),
        ...TGNS,
      ]);

      expect(split.map((s) => s.styleCode)).toEqual(["02262", "02285"]);
      expect(split[0].aliases).toHaveLength(9);
      expect(split[1].aliases).toHaveLength(1);
    });
  });

  describe("no proposal", () => {
    it("returns nothing when the lens has no Innovations group", () => {
      const groups = buildAliasGroups(TGNS);
      const result = matchLens(lens("TGNS", { lenstype: { name: "Endless SV" } }), groups);

      expect(result.group).toEqual([]);
      expect(result.proposed).toEqual([]);
      expect(result.kind).toBeNull();
    });

    it("returns nothing when the group carries no colour for the option", () => {
      const groups = buildAliasGroups([alias("0000226200001", "SRCoated")]);
      const result = matchLens(lens("Drivewear"), groups);

      expect(result.group).toHaveLength(1);
      expect(result.proposed).toEqual([]);
      expect(result.kind).toBeNull();
      expect(result.reason).toBeNull();
    });

    it("returns nothing when the lens has no option at all", () => {
      const groups = buildAliasGroups(TGNS);
      const result = matchLens(lens("TGNS", { lens_lens_options: [] }), groups);

      expect(result.proposed).toEqual([]);
      expect(result.optionName).toBe("");
    });
  });

  describe("diagnosing a missing group", () => {
    const index = buildAliasIndex(TGNS);

    it("names a lens design no synced alias uses", () => {
      // Innovations does list this — as "Endless" under Single Vision — but no
      // alias for it reaches our mirror, so it is unmappable here.
      const l = lens("TGNS", { lenstype: { name: "Endless SV" } });
      expect(diagnoseMissingGroup(l, index)).toBe("style_absent");
    });

    it("names a material no synced alias uses", () => {
      // 1.60 Index exists in the Innovations lens database; the export omits it.
      const l = lens("TGNS", { material: { name: "1.60 High Index" } });
      expect(diagnoseMissingGroup(l, index)).toBe("material_absent");
    });

    it("diagnoses on the pricing_key labels, not the Innovations-side ones", () => {
      // pricing_key says "Poly"/"1.67 High Index" where material_description
      // says "Poly 1.59"/"1.67 Index". Comparing the wrong field reports a
      // material as missing when it is only spelled differently.
      const idx = buildAliasIndex([
        alias("0010226200001", "SRCoated", {
          material_description: "Poly 1.59",
          pricing_key: "Poly | Progressive | Endless Steady",
        }),
      ]);
      const l = lens("SRCoated", { material: { name: "Poly" }, lenstype: { name: "Reader II" } });
      // Material is present under its pricing_key name, so the gap is the style.
      expect(diagnoseMissingGroup(l, idx)).toBe("style_absent");
      expect(idx.materials.has("poly")).toBe(true);
      expect(idx.materials.has("poly 1.59")).toBe(false);
    });

    it("falls back to the combination when both sides exist separately", () => {
      const groups = buildAliasIndex([
        alias("0000226200001", "SRCoated"),
        alias("0000002800001", "UNCoated", {
          style_description: "Flat Top 28",
          material_description: "Trivex 1.53",
          pricing_key: "Trivex 1.53 | Bifocal | Flat Top 28",
        }),
      ]);
      const l = lens("SRCoated", { material: { name: "Trivex 1.53" }, lenstype: { name: "Endless Steady" } });
      expect(diagnoseMissingGroup(l, groups)).toBe("combination_absent");
    });
  });
});
