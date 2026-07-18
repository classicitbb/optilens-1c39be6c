import { describe, expect, it } from "vitest";
import { normMaterial, normTreatment, tierFor, TIER_MAP } from "@/lib/pricing/classifier";

// BS1-05: classifier.ts is ported from lens-classifier.js, then corrected
// against real live-catalog naming as gaps were found via Auto Price runs.
// Each case here traces back to a specific live lens name that misclassified.

describe("normTreatment: Trans Gen S naming variants", () => {
  it("classifies all three confirmed live naming patterns as Trans Gen S", () => {
    expect(normTreatment("1.67 LBUC PROG Endless Steady TGNS Gray")).toBe("Trans Gen S™");
    expect(normTreatment("1.50 SF SV Regular Trans 8 Gray")).toBe("Trans Gen S™");
    // Found live 2026-07-15: no "trans" substring at all — previously fell
    // through to the Clear default, silently misclassified.
    expect(normTreatment("1.50 SF BF Round Seg 24 Gray 8 SRC")).toBe("Trans Gen S™");
  });

  it("does not misroute a plain SRCoat lens as Trans Gen S", () => {
    expect(normTreatment("1.50 FIN SV Regular AR SRCoated")).toBe("Clear");
  });
});

describe("normTreatment: other treatment families still resolve correctly", () => {
  it("XtrActive Polarized takes priority over plain XtrActive or Polarized", () => {
    expect(normTreatment("1.67 XtrActive Polarized Brown")).toBe("Trans® XtrActive® Polarized");
    expect(normTreatment("1.67 XtrActive New Gen Gray")).toBe("Trans® XtrActive® New Gen");
  });

  it("Photochromic splits Gray vs Brown", () => {
    expect(normTreatment("1.50 Photochromic Gray")).toBe("Photochromic - Gray");
    expect(normTreatment("1.50 Photochromic Brown")).toBe("Photochromic - Brown");
  });

  it("Polarized and UV420 classify independently of Trans Gen S", () => {
    expect(normTreatment("1.50 SV Regular Polarized Gray")).toBe("Polarized");
    expect(normTreatment("1.50 SV Regular UV420 Blue")).toBe("UV420");
  });

  it("unrecognized treatment defaults to Clear", () => {
    expect(normTreatment("1.50 SV Regular Plain Lens")).toBe("Clear");
  });
});

describe("normMaterial", () => {
  it("prefers the name prefix over the material column", () => {
    expect(normMaterial("1.67 LBUC PROG Endless Steady TGNS", "Plastic 1.50")).toBe("1.67");
  });

  it("recognizes TRIVEX and POLY", () => {
    expect(normMaterial("TRIVEX SV Regular Clear", null)).toBe("TRIVEX");
    expect(normMaterial("POLY LBUC PROG Endless Steady TGNS", null)).toBe("POLY");
  });
});

describe("tierFor: newly added live design names", () => {
  it("classifies Varilux Comfort 3 and Digital Executive 60mm Blended (added 2026-07-15)", () => {
    expect(tierFor("Progressive", "Varilux Comfort 3")).toBe("Progressive - Adept");
    expect(tierFor("Bifocal", "Digital Executive 60mm Blended")).toBe("Specific Use - Adept Bifocal");
  });

  it("Endless Sport is a Progressive design, tiered as Specific Use - Sport", () => {
    expect(TIER_MAP["Progressive|Endless Sport"]).toBe("Specific Use - Sport");
    expect(tierFor("Progressive", "Endless Sport")).toBe("Specific Use - Sport");
  });

  it("returns null for a design not in TIER_MAP, rather than guessing", () => {
    expect(tierFor("Progressive", "Some Unknown Design")).toBeNull();
  });
});
