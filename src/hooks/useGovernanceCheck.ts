import type { PricingEngineResult } from "./usePricingEngine";
import type { PricingSettings } from "./usePricingSettings";

export interface GovernanceResult {
  blocked: boolean;
  blockReasons: string[];
  needsReason: boolean;
}

export const checkGovernance = (
  calc: PricingEngineResult | null,
  settings: PricingSettings | null | undefined,
  supplierCost: number
): GovernanceResult => {
  const result: GovernanceResult = { blocked: false, blockReasons: [], needsReason: false };
  if (!calc || !settings) return result;

  // Block: zero cost
  if (supplierCost <= 0 || calc.full_cost <= 0) {
    result.blocked = true;
    result.blockReasons.push("Supplier cost cannot be zero");
  }

  // Block: selling at loss
  if (settings.block_loss && calc.governance_flags.at_loss) {
    result.blocked = true;
    result.blockReasons.push("Sell price does not cover full cost");
  }

  // Block: below margin floor
  if (settings.block_below_floor && calc.governance_flags.below_floor && !calc.governance_flags.at_loss) {
    result.blocked = true;
    result.blockReasons.push("Sell price is below the margin floor for this category");
  }

  // Require reason: below strategic price
  if (settings.require_concession_reason && calc.strategic_price > 0) {
    const sellPrice = calc.margin != null ? calc.full_cost / (1 - calc.margin) : 0;
    if (sellPrice > 0 && sellPrice < calc.strategic_price && !result.blocked) {
      result.needsReason = true;
    }
  }

  return result;
};

export const CONCESSION_REASONS = [
  "Competitive match",
  "Customer retention",
  "Volume deal",
  "Management override",
  "Other",
] as const;
