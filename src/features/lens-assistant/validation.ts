import type { EyePrescription, LensRecommendationInput } from "@/features/lens-assistant/types";

export interface LensAssistantValidation {
  errors: Record<string, string>;
  warnings: string[];
  isValid: boolean;
}

const validateEye = (eye: EyePrescription, prefix: "right" | "left", errors: Record<string, string>) => {
  if (eye.sphere == null) errors[`${prefix}.sphere`] = "Sphere is required.";
  if (eye.sphere != null && (eye.sphere < -30 || eye.sphere > 30)) errors[`${prefix}.sphere`] = "Enter a sphere between -30.00 and +30.00.";
  if (eye.cylinder != null && (eye.cylinder < -12 || eye.cylinder > 12)) errors[`${prefix}.cylinder`] = "Enter a cylinder between -12.00 and +12.00.";
  if (eye.cylinder != null && Math.abs(eye.cylinder) > 0 && eye.axis == null) errors[`${prefix}.axis`] = "Axis is required when cylinder is entered.";
  if (eye.axis != null && (eye.axis < 1 || eye.axis > 180)) errors[`${prefix}.axis`] = "Axis must be between 1 and 180.";
  if (eye.add != null && (eye.add < 0.25 || eye.add > 4)) errors[`${prefix}.add`] = "Add must be between +0.25 and +4.00.";
  if (eye.prism != null && eye.prism > 0 && !eye.prismBase) errors[`${prefix}.prismBase`] = "Choose a prism base direction.";
  if (eye.prism != null && (eye.prism < 0 || eye.prism > 20)) errors[`${prefix}.prism`] = "Enter prism between 0 and 20 dioptres.";
};

export const validateLensRecommendationInput = (input: LensRecommendationInput): LensAssistantValidation => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  validateEye(input.right, "right", errors);
  validateEye(input.left, "left", errors);

  if (!input.ageBand) errors.ageBand = "Choose an age range.";
  if (!input.primaryUse) errors.primaryUse = "Choose the main visual use.";
  if (!input.frameType) errors.frameType = "Choose a frame type.";
  if (!input.priceLevel) errors.priceLevel = "Choose a preferred price level.";
  if (!input.lightPreference) errors.lightPreference = "Choose a light or tint preference.";

  for (const [key, value] of [["frameA", input.frameA], ["frameB", input.frameB], ["frameDbl", input.frameDbl]] as const) {
    if (value != null && (value < 10 || value > 100)) errors[key] = "Enter a frame measurement between 10 and 100 mm.";
  }

  const rightHasAdd = input.right.add != null;
  const leftHasAdd = input.left.add != null;
  if (rightHasAdd !== leftHasAdd) warnings.push("Only one eye has an Add value. Confirm the prescription before ordering.");
  if (input.right.add != null && input.left.add != null && Math.abs(input.right.add - input.left.add) > 0.5) {
    warnings.push("The Add values differ by more than 0.50D. Confirm this with the prescriber.");
  }
  if (input.frameType === "rimless" && Math.max(Math.abs(input.right.sphere ?? 0), Math.abs(input.left.sphere ?? 0)) >= 6) {
    warnings.push("A high-powered prescription in a rimless frame needs a lab suitability review.");
  }
  if ((input.right.prism ?? 0) > 0 || (input.left.prism ?? 0) > 0) {
    warnings.push("Prism orders require lab confirmation before final submission.");
  }

  return { errors, warnings, isValid: Object.keys(errors).length === 0 };
};
