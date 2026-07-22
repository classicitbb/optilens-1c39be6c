import { describe, expect, it } from "vitest";
import { computeShipmentDerivedTotals } from "@/lib/importCostings";

const shipment = {
  currency: "USD",
  exchange_rate: 2,
  fob_foreign: 995.14,
  invoice_total_foreign: 995.14,
  freight_provider: "dhl" as const,
};

const charges = [
  { charge_type: "Government Fee", amount_bbd: 10, vat_bbd: 0, duty_bbd: 0 },
  { charge_type: "Duty Tax Processing", amount_bbd: 40, vat_bbd: 7, duty_bbd: 0 },
  { charge_type: "Non-Routine Entry", amount_bbd: 60, vat_bbd: 10.5, duty_bbd: 0 },
  { charge_type: "Duty Tax Processing", amount_bbd: 0, vat_bbd: 368.32, duty_bbd: 0 },
  { charge_type: "Miscellaneous", amount_bbd: 27.54, vat_bbd: 0, duty_bbd: 0 },
  { charge_type: "Miscellaneous", amount_bbd: 40.35, vat_bbd: 0, duty_bbd: 0 },
  { charge_type: "Insurance & Freight", amount_bbd: 146.42, vat_bbd: 0, duty_bbd: 0 },
];

describe("import costing totals", () => {
  it("separates VAT while allocating charity and non-VAT charges into landed cost", () => {
    const totals = computeShipmentDerivedTotals(shipment, charges);

    expect(totals.amountTotal).toBeCloseTo(324.31, 6);
    expect(totals.vatTotal).toBeCloseTo(385.82, 6);
    expect(totals.chargeSubtotalExcludingVatBbd).toBeCloseTo(324.31, 6);
    expect(totals.totalChargesIncludingVatBbd).toBeCloseTo(710.13, 6);
    expect(totals.charityAllocationBbd).toBeCloseTo(14.642, 6);
    expect(totals.totalShipmentCostBbd).toBeCloseTo(338.952, 6);
    expect(totals.totalLandedBbd).toBeCloseTo(2329.232, 6);
    expect(totals.multiplier).toBeCloseTo(2329.232 / 995.14, 6);
  });

  it("does not apply the DHL charity allocation to non-DHL shipments", () => {
    const totals = computeShipmentDerivedTotals({ ...shipment, freight_provider: "non-dhl" }, charges);

    expect(totals.charityAllocationBbd).toBe(0);
    expect(totals.totalLandedBbd).toBeCloseTo(2314.59, 6);
  });
});
