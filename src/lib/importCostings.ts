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

export type PricingSettingsRateSource = {
  import_costing_fx_rates?: Record<string, number> | null;
};

export const formatMoney = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  },
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
  // VAT is reported separately and is not allocated into landed product cost.
  // The DHL charity contribution is a real landed cost and must be allocated.
  const totalShipmentCostBbd = chargeSubtotalExcludingVatBbd + charityAllocationBbd;
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
  };
};
