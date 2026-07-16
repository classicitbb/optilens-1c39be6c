import { describe, expect, it } from "vitest";
import { resolveComboForLens } from "@/lib/pricing/save";

// BS1-05 task 7: resolveComboForLens is the pure piece of Save/Save As New —
// given a linked lens, which pricing_item (treatment||tier||material) does
// its price belong to. Deliberately does NOT gate on active/excluded/cost
// the way classifyLensRows does — a linked matrix cell is already the
// operator's decision, Save just needs to know which combo it represents.

describe("resolveComboForLens", () => {
  it("resolves a normal lens to its combo", () => {
    const combo = resolveComboForLens({ name: "1.50 FIN SV Regular Clear", mftype: "Single Vision", lenstype: "Regular", material: "Plastic 1.50" });
    expect(combo).toEqual({ treatment: "Clear", tier: "Single Vision - Regular", material: "1.50", comboKey: "Clear||Single Vision - Regular||1.50" });
  });

  it("returns null for a design not in TIER_MAP, same as the classifier", () => {
    const combo = resolveComboForLens({ name: "Something", mftype: "Nonsense", lenstype: "Whatever", material: null });
    expect(combo).toBeNull();
  });

  it("returns null when the material can't be parsed, even if the tier resolves", () => {
    const combo = resolveComboForLens({ name: "Mystery Lens With No Index Token", mftype: "Single Vision", lenstype: "Regular", material: null });
    expect(combo).toBeNull();
  });

  it("resolves regardless of active/excluded state — Save trusts the matrix link, not catalog eligibility", () => {
    // No active/excludedFromAnchor fields exist on LensLookupRow at all —
    // this test documents that omission is intentional, not an oversight.
    const combo = resolveComboForLens({ name: "1.74 LBUC PROG Endless Steady TGNS Gray", mftype: "Progressive", lenstype: "Endless Steady", material: null });
    expect(combo?.treatment).toBe("Trans Gen S™");
    expect(combo?.tier).toBe("Progressive - Best");
    expect(combo?.material).toBe("1.74");
  });
});
