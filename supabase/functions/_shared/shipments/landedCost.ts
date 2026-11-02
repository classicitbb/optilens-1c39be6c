// Single source of truth for shipment landed-cost math. Pure (no imports) so the
// app (via src/lib/importCostings.ts) and the shipment-binder edge function
// compute identical numbers.

export type ShipmentRateSource = {
  currency?: string | null;
  exchange_rate?: number | null;
};

export type ShipmentChargeLike = {
  shipment_id?: string | null;
  charge_type?: string | null;
  amount_bbd?: number | null;
  vat_bbd?: number | null;
  duty_bbd?: number | null;
};

export type ForeignExchangeFeeSource = {
  settlement_method?: string | null;
  fxf_applicability?: "applicable" | "exempt" | "manual_override" | null;
  fxf_rate?: number | null;
  fxf_actual_bbd?: number | null;
};

export type PricingSettingsRateSource = {
  import_costing_fx_rates?: Record<string, number> | null;
};

export type ShipmentLineCostSource = {
  line_fob_foreign: number;
  quantity: number;
  markup_percent: number;
  linked_sell_total_bbd?: number | null;
};

export const resolveShipmentExchangeRate = (
  shipment: ShipmentRateSource,
  settings?: PricingSettingsRateSource | null
) => {
  const currency = shipment.currency ?? "USD";
  const settingsRate = settings?.import_costing_fx_rates?.[currency];
  if (typeof settingsRate === "number" && Number.isFinite(settingsRate) && settingsRate > 0) {
    return settingsRate;
  }

  const shipmentRate = shipment.exchange_rate;
  if (typeof shipmentRate === "number" && Number.isFinite(shipmentRate) && shipmentRate > 0) {
    return shipmentRate;
  }

  return 1;
};

export const computeChargeRowTotal = (charge: ShipmentChargeLike) =>
  (charge.amount_bbd || 0) + (charge.vat_bbd || 0) + (charge.duty_bbd || 0);

export const computeChargeTotals = (charges: ShipmentChargeLike[]) => {
  const amountTotal = charges.reduce((sum, charge) => sum + (charge.amount_bbd || 0), 0);
  const vatTotal = charges.reduce((sum, charge) => sum + (charge.vat_bbd || 0), 0);
  const dutyTotal = charges.reduce((sum, charge) => sum + (charge.duty_bbd || 0), 0);
  // Duty is part of the landed charge base, but VAT is kept separate so it is
  // visible in reports without inflating landed cost or the line-item multiplier.
  const chargeSubtotalExcludingVatBbd = amountTotal + dutyTotal;
  const totalChargesIncludingVatBbd = chargeSubtotalExcludingVatBbd + vatTotal;

  return {
    amountTotal,
    vatTotal,
    dutyTotal,
    chargeSubtotalExcludingVatBbd,
    totalChargesIncludingVatBbd,
  };
};

export const computeInsuranceFreightCharge = (charges: ShipmentChargeLike[]) => {
  const insuranceFreight = charges.find((charge) =>
    (charge.charge_type || "").trim().toLowerCase() === "insurance & freight"
  );

  return insuranceFreight?.amount_bbd || 0;
};

export const computeCharityAllocation = (
  charges: ShipmentChargeLike[],
  freightProvider: "dhl" | "non-dhl" = "dhl"
) => {
  if (freightProvider !== "dhl") return 0;
  return computeInsuranceFreightCharge(charges) * 0.1;
};

export const computeShipmentDerivedTotals = (
  shipment: ShipmentRateSource & {
    fob_foreign?: number | null;
    invoice_total_foreign?: number | null;
    freight_provider?: "dhl" | "non-dhl" | null;
  } & ForeignExchangeFeeSource,
  charges: ShipmentChargeLike[],
  settings?: PricingSettingsRateSource | null
) => {
  const exchangeRate = resolveShipmentExchangeRate(shipment, settings);
  const fobForeign = shipment.fob_foreign || 0;
  const invoiceForeign = shipment.invoice_total_foreign || 0;
  const fobBbd = fobForeign * exchangeRate;
  const invoiceBbd = invoiceForeign * exchangeRate;
  const {
    amountTotal,
    vatTotal,
    dutyTotal,
    chargeSubtotalExcludingVatBbd,
    totalChargesIncludingVatBbd,
  } = computeChargeTotals(charges);
  const charityAllocationBbd = computeCharityAllocation(charges, shipment.freight_provider ?? "dhl");
  const insuranceFreightBbd = computeInsuranceFreightCharge(charges);
  // The approved FXF basis is CIF: supplier FOB converted to BBD plus insurance/freight.
  // FCA and other explicitly exempt settlements do not create a system fee.
  // Null is intentional for pre-workbench records. Do not backfill or alter
  // historical finalized landed costs simply because the new model exists.
  const hasFxfModel = shipment.settlement_method != null || shipment.fxf_applicability != null || shipment.fxf_rate != null || shipment.fxf_actual_bbd != null;
  const fxfApplicable = hasFxfModel && shipment.fxf_applicability !== "exempt" && shipment.settlement_method !== "FCA";
  const fxfBasisBbd = fxfApplicable ? fobBbd + insuranceFreightBbd : 0;
  const fxfRate = shipment.fxf_rate ?? 0.02;
  const expectedFxfBbd = Math.round(fxfBasisBbd * fxfRate * 100) / 100;
  const actualFxfBbd = shipment.fxf_actual_bbd ?? expectedFxfBbd;
  const fxfVarianceBbd = Math.round((actualFxfBbd - expectedFxfBbd) * 100) / 100;
  // VAT is reported separately and is not allocated into landed product cost.
  // The DHL charity contribution is a real landed cost and must be allocated.
  const totalShipmentCostBbd = chargeSubtotalExcludingVatBbd + charityAllocationBbd + actualFxfBbd;
  const totalLandedBbd = invoiceBbd + totalShipmentCostBbd;
  const multiplier = fobForeign > 0 ? totalLandedBbd / fobForeign : 0;
  const totalLandedUsd = exchangeRate > 0 ? totalLandedBbd / exchangeRate : 0;

  return {
    exchangeRate,
    fobBbd,
    invoiceBbd,
    amountTotal,
    vatTotal,
    dutyTotal,
    chargeSubtotalExcludingVatBbd,
    totalChargesIncludingVatBbd,
    totalLandedBbd,
    totalLandedUsd,
    charityAllocationBbd,
    totalShipmentCostBbd,
    multiplier,
    insuranceFreightBbd,
    fxfApplicable,
    fxfBasisBbd,
    fxfRate,
    expectedFxfBbd,
    actualFxfBbd,
    fxfVarianceBbd,
  };
};

export const computeLineCosts = (
  line: ShipmentLineCostSource,
  xr: number,
  multiplier: number
) => {
  const lineFobBbd = line.line_fob_foreign * xr;
  // The multiplier is landed BBD per unit of foreign FOB, so it already carries the
  // exchange rate; apply it to the foreign amount, not to lineFobBbd.
  const landedLineBbd = line.line_fob_foreign * multiplier;
  const landedUnitBbd = line.quantity > 0 ? landedLineBbd / line.quantity : 0;
  const landedUnitUsd = xr > 0 ? landedUnitBbd / xr : 0;
  // A linked order fixes the sell price; markup is then the result, not an input.
  const linked = line.linked_sell_total_bbd != null && line.quantity > 0;
  const sellBbd = linked
    ? (line.linked_sell_total_bbd as number) / line.quantity
    : landedUnitBbd * (1 + (line.markup_percent || 0) / 100);
  const markupPercent = linked
    ? (landedUnitBbd > 0 ? (sellBbd / landedUnitBbd - 1) * 100 : 0)
    : line.markup_percent || 0;
  const sellUsd = xr > 0 ? sellBbd / xr : 0;
  return { lineFobBbd, landedLineBbd, landedUnitBbd, landedUnitUsd, sellBbd, sellUsd, markupPercent, linked };
};

/** Shipment totals plus per-line landed cost, as the screen, reports and binder all present them. */
export const computeShipmentCosting = <L extends ShipmentLineCostSource>(
  shipment: Parameters<typeof computeShipmentDerivedTotals>[0],
  charges: ShipmentChargeLike[],
  lines: L[],
  settings?: PricingSettingsRateSource | null
) => {
  const totals = computeShipmentDerivedTotals(shipment, charges, settings);
  return {
    totals,
    lines: lines.map((line) => ({ line, costs: computeLineCosts(line, totals.exchangeRate, totals.multiplier) })),
  };
};
