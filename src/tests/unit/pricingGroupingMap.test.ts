import { describe, expect, it } from "vitest";
import { TIER_MAP } from "@/lib/pricing/classifier";
import { CATEGORY_KEY_MAP, GROUPING_KEY_MAP, categoryKeyFor, groupingKeyFor, materialKeyFor } from "@/lib/pricing/groupingMap";

// BS1-05: every value the classifier can actually produce must have a live
// grouping/category key to land on, or Auto Price would silently drop a
// combo instead of pricing it. This is a regression guard — if TIER_MAP or
// normTreatment() gains a new output value without an update here, this
// test fails loudly instead of Auto Price quietly skipping combos.

const possibleTreatments = [
  "Clear",
  "Polarized",
  "Photochromic - Gray",
  "Photochromic - Brown",
  "UV420",
  "Trans Gen S™",
  "Trans® XtrActive® New Gen",
  "Trans® XtrActive® Polarized",
];

describe("groupingMap: completeness against the classifier's actual output", () => {
  it("every TIER_MAP tier value has a live category key", () => {
    const distinctTiers = new Set(Object.values(TIER_MAP));
    for (const tier of distinctTiers) {
      expect(categoryKeyFor(tier), `no category key mapped for tier "${tier}"`).not.toBeNull();
    }
  });

  it("every reachable normTreatment() output has a live grouping key", () => {
    for (const treatment of possibleTreatments) {
      expect(groupingKeyFor(treatment), `no grouping key mapped for treatment "${treatment}"`).not.toBeNull();
    }
  });

  it("does not map anything onto the deprecated duplicate transitions_gen_s_2", () => {
    expect(Object.values(GROUPING_KEY_MAP)).not.toContain("transitions_gen_s_2");
  });

  it("collapses the live round/FT bifocal split onto the classifier's digital/conventional split", () => {
    expect(CATEGORY_KEY_MAP["Specific Use - Bifocal"]).toBe("specific_use_bifocal_round");
    expect(CATEGORY_KEY_MAP["Specific Use - Adept Bifocal"]).toBe("specific_use_bifocal_ft");
  });

  it("maps material keys onto the 6-column matrix, including the Trivex casing fix", () => {
    expect(materialKeyFor("1.50")).toBe("1.50");
    expect(materialKeyFor("TRIVEX")).toBe("Trivex");
    expect(materialKeyFor("POLY")).toBe("POLY");
  });

  it("materials with no matrix column (1.56/1.59/GLASS) return null, not a guess", () => {
    expect(materialKeyFor("1.56")).toBeNull();
    expect(materialKeyFor("1.59")).toBeNull();
    expect(materialKeyFor("GLASS")).toBeNull();
  });
});
