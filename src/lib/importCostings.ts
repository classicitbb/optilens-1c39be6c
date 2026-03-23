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
  fx_rates?: Record<string, number> | null;
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
  const settingsRate = settings?.fx_rates?.[currency];
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
  const totalChargesBbd = charges.reduce((sum, charge) => sum + computeChargeRowTotal(charge), 0);

  return {
    amountTotal,
    vatTotal,
    dutyTotal,
    totalChargesBbd,
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
  const { amountTotal, vatTotal, dutyTotal, totalChargesBbd } = computeChargeTotals(charges);
  const totalLandedBbd = invoiceBbd + totalChargesBbd;
  const charityAllocationBbd = computeCharityAllocation(charges, shipment.freight_provider ?? "dhl");
  const totalShipmentCostBbd = totalChargesBbd + charityAllocationBbd;
  const multiplier = fobForeign > 0 ? totalLandedBbd / fobForeign : 0;
  const totalLandedUsd = exchangeRate > 0 ? totalLandedBbd / exchangeRate : 0;

  return {
    exchangeRate,
    fobBbd,
    invoiceBbd,
    amountTotal,
    vatTotal,
    dutyTotal,
    totalChargesBbd,
    totalLandedBbd,
    totalLandedUsd,
    charityAllocationBbd,
    totalShipmentCostBbd,
    multiplier,
  };
};
