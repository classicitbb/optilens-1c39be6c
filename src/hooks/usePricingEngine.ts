import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PricingSettings } from "./usePricingSettings";
import { fxFeePercent, importChargesPercent } from "@/lib/pricing/costModel";

// ── Types ──────────────────────────────────────────────

export interface PricingEngineInput {
  component_type: string;
  supplier_cost: number;
  currency: string;
  bb_item: boolean;
  vat_recoverable: boolean;
  duty_applicable: boolean;
  labour_cost: number;
  category: string;
  avg_days_in_stock?: number;
  sell_price?: number;
  previous_sell_price?: number;
}

export interface PricingEngineResult {
  converted_cost: number;
  cif: number;
  duty: number;
  charges: number;
  vat: number;
  landed_cost: number;
  overhead: number;
  financing: number;
  holding: number;
  shrinkage: number;
  labour: number;
  full_cost: number;
  strategic_price: number;
  margin: number | null;
  margin_status: "healthy" | "thin" | "below_floor" | "loss" | null;
  governance_flags: {
    below_floor: boolean;
    at_loss: boolean;
    below_target: boolean;
    exceeds_price_increase: boolean;
  };
  // Dual-currency fields (computed, not stored)
  supplier_cost_usd: number;
  sell_price_usd: number | null;
  fx_rate_used: number;
}

// ── Pure calculation function ──────────────────────────

export function calculatePricingEngine(
  input: PricingEngineInput,
  settings: PricingSettings
): PricingEngineResult {
  const {
    supplier_cost,
    currency,
    bb_item,
    vat_recoverable,
    duty_applicable,
    labour_cost,
    category,
    sell_price,
    previous_sell_price,
  } = input;

  const days = input.avg_days_in_stock ?? settings.avg_days_in_stock;

  // 1. Currency conversion
  const fxRates = settings.fx_rates as Record<string, number>;
  let converted_cost: number;
  if (bb_item) {
    converted_cost = supplier_cost;
  } else {
    const rate = fxRates[currency] ?? 1;
    converted_cost = supplier_cost * rate * (1 + settings.fx_risk_buffer);
  }

  // 2. Landed cost. Every imported item carries the blended import charges
  // (freight, insurance, brokerage, clearance) and the 2% foreign exchange fee;
  // duty (and VAT, if not recoverable) only where duty_applicable. Shared with
  // the Auto Price engine through costModel.ts.
  let cif = converted_cost;
  let duty = 0;
  let charges = 0;
  let vat = 0;
  let landed_cost: number;

  if (!bb_item) {
    cif = converted_cost * (1 + importChargesPercent(settings));
    charges = cif * fxFeePercent(settings) + settings.brokerage_fee + settings.port_charges;

    if (duty_applicable) {
      const dutyRates = settings.duty_rates as Record<string, number>;
      const dutyRate = dutyRates[category] ?? 0;
      duty = cif * dutyRate;
      vat = (cif + duty + charges) * settings.vat_rate;
    }

    landed_cost = cif + duty + charges + (vat_recoverable ? 0 : vat);
  } else {
    landed_cost = converted_cost;
  }

  // 3. Allowances: financing and waste only. Overhead and holding are no longer
  // priced in; labour arrives in the supplier's currency and is converted here.
  const overhead = 0;
  const holding = 0;
  const financing = landed_cost * (settings.cost_of_capital * days / 365);
  const shrinkage = landed_cost * settings.shrinkage_percent;
  const labour = bb_item ? labour_cost : labour_cost * (fxRates[currency] ?? 1) * (1 + settings.fx_risk_buffer);

  // 4. Full cost
  const full_cost = landed_cost + financing + shrinkage + labour;

  // 5. Strategic price
  const catMargins = settings.category_target_margins as Record<string, number>;
  const targetMargin = catMargins[category] ?? settings.target_margin;
  const strategic_price = targetMargin < 1 ? full_cost / (1 - targetMargin) : full_cost * 2;

  // 6. Margin analysis
  let margin: number | null = null;
  let margin_status: PricingEngineResult["margin_status"] = null;

  if (sell_price != null && sell_price > 0) {
    margin = (sell_price - full_cost) / sell_price;

    const catFloors = settings.category_margin_floors as Record<string, number>;
    const floor = catFloors[category] ?? 0;

    if (margin < 0) margin_status = "loss";
    else if (margin < floor) margin_status = "below_floor";
    else if (margin < targetMargin) margin_status = "thin";
    else margin_status = "healthy";
  }

  // 7. Governance flags
  const catFloors = settings.category_margin_floors as Record<string, number>;
  const floor = catFloors[category] ?? 0;

  const governance_flags = {
    below_floor: margin != null && margin < floor,
    at_loss: margin != null && margin < 0,
    below_target: margin != null && margin < targetMargin,
    exceeds_price_increase:
      previous_sell_price != null &&
      previous_sell_price > 0 &&
      sell_price != null
        ? (sell_price - previous_sell_price) / previous_sell_price > settings.max_price_increase
        : false,
  };

  // Dual-currency: compute effective FX rate and USD equivalent of sell price
  const effectiveRate = bb_item ? 1 : (fxRates[currency] ?? 1) * (1 + settings.fx_risk_buffer);

  return {
    converted_cost,
    cif,
    duty,
    charges,
    vat,
    landed_cost,
    overhead,
    financing,
    holding,
    shrinkage,
    labour,
    full_cost,
    strategic_price,
    margin,
    margin_status,
    governance_flags,
    supplier_cost_usd: supplier_cost,
    sell_price_usd: sell_price != null && sell_price > 0 && effectiveRate > 0
      ? sell_price / effectiveRate
      : null,
    fx_rate_used: effectiveRate,
  };
}

// ── React hook ─────────────────────────────────────────

export const usePricingEngine = () => {
  const { data: settings, isLoading } = useQuery<PricingSettings>({
    queryKey: ["pricing_settings_active"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("pricing_settings") as any)
        .select("*")
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as PricingSettings;
    },
  });

  const calculate = (input: PricingEngineInput): PricingEngineResult | null => {
    if (!settings) return null;
    return calculatePricingEngine(input, settings);
  };

  return { calculate, settings, isLoading };
};
