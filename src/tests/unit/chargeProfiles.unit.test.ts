import { describe, expect, it } from "vitest";
import { deriveChargeProfiles } from "@/features/shipments/chargeProfiles";

describe("deriveChargeProfiles", () => {
  it("uses the most frequent full row profile, including reclaimability and notes", () => {
    const profiles = deriveChargeProfiles([
      { shipment_id: "new", charge_type: "Duty Tax Processing", amount_bbd: 40, vat_bbd: 7, duty_bbd: 0, vat_reclaimable: true, notes: "Duty entry" },
      { shipment_id: "middle", charge_type: "Duty Tax Processing", amount_bbd: 40, vat_bbd: 7, duty_bbd: 0, vat_reclaimable: true, notes: "Duty entry" },
      { shipment_id: "old", charge_type: "Duty Tax Processing", amount_bbd: 38.71, vat_bbd: 0, duty_bbd: 0, vat_reclaimable: false, notes: "" },
    ], ["new", "middle", "old"]);

    expect(profiles["Duty Tax Processing"]).toEqual({
      amount_bbd: 40,
      vat_bbd: 7,
      duty_bbd: 0,
      vat_reclaimable: true,
      notes: "Duty entry",
      count: 2,
    });
  });

  it("breaks equally common profiles with the most recent shipment", () => {
    const profiles = deriveChargeProfiles([
      { shipment_id: "old", charge_type: "Government Fee", amount_bbd: 10, vat_bbd: 0, duty_bbd: 0, vat_reclaimable: false, notes: "Old" },
      { shipment_id: "old-2", charge_type: "Government Fee", amount_bbd: 10, vat_bbd: 0, duty_bbd: 0, vat_reclaimable: false, notes: "Old" },
      { shipment_id: "new", charge_type: "Government Fee", amount_bbd: 12, vat_bbd: 0, duty_bbd: 0, vat_reclaimable: false, notes: "New" },
      { shipment_id: "new-2", charge_type: "Government Fee", amount_bbd: 12, vat_bbd: 0, duty_bbd: 0, vat_reclaimable: false, notes: "New" },
    ], ["new", "new-2", "old", "old-2"]);

    expect(profiles["Government Fee"]?.notes).toBe("New");
  });

  it("does not offer a profile that is not yet common", () => {
    const profiles = deriveChargeProfiles([
      { shipment_id: "one", charge_type: "Miscellaneous", amount_bbd: 9, vat_bbd: 0, duty_bbd: 0, vat_reclaimable: false, notes: "" },
    ], ["one"]);

    expect(profiles).toEqual({});
  });
});
