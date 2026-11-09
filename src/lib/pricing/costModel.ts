/**
 * costModel.ts — one landed-cost model for every pricer.
 *
 * Both the edit-modal calculator (usePricingEngine) and the Auto Price engine
 * (engine.ts) build their cost from these settings so they cannot drift apart:
 *
 *   cost = supplier price x FX x (1 + import charges) x (1 + duty + FX fee)
 *          x (1 + financing + waste)  [+ labour, calculator only]
 *
 * Import charges = freight, insurance, brokerage and clearance as one blended
 * % of the converted price. Fixed per-shipment charges make small shipments dear
 * and large ones cheap, so a blended rate (rolling lens shipments, Jun–Nov 2026:
 * ~0.46 BBD of charges per USD of supplier price, i.e. ~23% at the 2.00 peg) keeps
 * prices stable. VAT is recoverable for a VAT-registered importer and is excluded.
 */
import type { CostModel } from "./engine";
import type { PricingSettings } from "@/hooks/usePricingSettings";

export const DEFAULT_IMPORT_CHARGES_PERCENT = 0.23;
export const DEFAULT_FX_FEE_PERCENT = 0.02; // Central Bank of Barbados foreign exchange fee

type CostSettings = Pick<
  PricingSettings,
  "cost_of_capital" | "avg_days_in_stock" | "shrinkage_percent" | "import_charges_percent" | "fx_fee_percent"
>;

export const importChargesPercent = (s: Pick<CostSettings, "import_charges_percent">) =>
  s.import_charges_percent ?? DEFAULT_IMPORT_CHARGES_PERCENT;

export const fxFeePercent = (s: Pick<CostSettings, "fx_fee_percent">) => s.fx_fee_percent ?? DEFAULT_FX_FEE_PERCENT;

/** Financing (cost of capital over the days held) plus waste, as a % of landed cost. */
export const carryAllowancePercent = (s: Pick<CostSettings, "cost_of_capital" | "avg_days_in_stock" | "shrinkage_percent">, days?: number) =>
  s.cost_of_capital * (days ?? s.avg_days_in_stock) / 365 + s.shrinkage_percent;

/** Cost model for engine.ts (prices in the supplier's currency, so freight/levy are %). */
export function costModelFromSettings(s: CostSettings, dutyRate = 0): CostModel {
  return {
    freightPct: { default: importChargesPercent(s) },
    dutyPct: dutyRate,
    leviesPct: fxFeePercent(s),
    allowancePct: carryAllowancePercent(s),
  };
}
