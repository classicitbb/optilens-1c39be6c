export type LensAssistantAudience = "professional" | "patient";
export type LensRecommendationTier = "good" | "better" | "best";

export interface EyePrescription {
  sphere: number | null;
  cylinder: number | null;
  axis: number | null;
  add: number | null;
  prism: number | null;
  prismBase: "up" | "down" | "in" | "out" | "";
}

export interface LensRecommendationInput {
  audience: LensAssistantAudience;
  patientReference: string;
  ageBand: "under-18" | "18-39" | "40-59" | "60-plus" | "";
  occupation: string;
  primaryUse: "general" | "driving" | "computer" | "outdoor" | "reading" | "";
  visualPriority: string;
  frameType: "full-rim" | "semi-rimless" | "rimless" | "sports" | "";
  frameA: number | null;
  frameB: number | null;
  frameDbl: number | null;
  priceLevel: "good" | "better" | "best" | "";
  lightPreference: "clear" | "photochromic" | "polarized" | "tinted" | "";
  adaptationIssues: boolean;
  right: EyePrescription;
  left: EyePrescription;
}

export interface LensRecommendationOption {
  tier: LensRecommendationTier;
  productId: string;
  productName: string;
  lensType: string | null;
  material: string | null;
  index: number | null;
  coating: string | null;
  priceBbd: number | null;
  priceStatus: "available" | "sign_in_required" | "not_assigned";
  turnaround: string;
  reasons: string[];
  warnings: string[];
}

export interface LensRecommendationResult {
  status: "ok" | "rules_unavailable" | "no_match";
  message: string;
  ruleSetId: string | null;
  ruleSetVersion: number | null;
  recommendations: LensRecommendationOption[];
}

export interface RxOrderDraft {
  id: string;
  user_id: string;
  status: "draft" | "ready_for_lablink" | "submitted_externally" | "archived";
  name: string;
  patient_reference: string | null;
  input_payload: LensRecommendationInput;
  recommendation_snapshot: LensRecommendationResult | null;
  rule_set_id: string | null;
  created_at: string;
  updated_at: string;
}
