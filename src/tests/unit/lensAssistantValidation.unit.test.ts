import { describe, expect, it } from "vitest";
import type { LensRecommendationInput } from "@/features/lens-assistant/types";
import { validateLensRecommendationInput } from "@/features/lens-assistant/validation";

const validInput = (): LensRecommendationInput => ({
  audience: "professional",
  patientReference: "TEST-001",
  ageBand: "40-59",
  occupation: "Office work",
  primaryUse: "computer",
  visualPriority: "Intermediate comfort",
  frameType: "full-rim",
  frameA: 54,
  frameB: 38,
  frameDbl: 18,
  priceLevel: "better",
  lightPreference: "clear",
  adaptationIssues: false,
  right: { sphere: -2, cylinder: -0.75, axis: 90, add: 1.5, prism: null, prismBase: "" },
  left: { sphere: -1.75, cylinder: -0.5, axis: 85, add: 1.5, prism: null, prismBase: "" },
});

describe("lens assistant validation", () => {
  it("accepts a complete internally consistent prescription", () => {
    expect(validateLensRecommendationInput(validInput())).toEqual({ errors: {}, warnings: [], isValid: true });
  });

  it("requires axis when cylinder is present", () => {
    const input = validInput();
    input.right.axis = null;
    const result = validateLensRecommendationInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors["right.axis"]).toMatch(/required/i);
  });

  it("requires a base direction for prism and warns instead of inventing suitability", () => {
    const input = validInput();
    input.left.prism = 2;
    const result = validateLensRecommendationInput(input);
    expect(result.errors["left.prismBase"]).toMatch(/base direction/i);
    expect(result.warnings.join(" ")).toMatch(/lab confirmation/i);
  });

  it("warns about suspicious paired-eye Add differences", () => {
    const input = validInput();
    input.left.add = 2.25;
    expect(validateLensRecommendationInput(input).warnings.join(" ")).toMatch(/differ/i);
  });
});
