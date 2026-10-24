import { describe, expect, it } from "vitest";
import { mergeSupplierShipmentDefaults } from "@/features/shipments/supplierShipmentDefaults";

describe("supplier shipment defaults", () => {
  it("never erases values typed before or during the lookup", () => {
    expect(mergeSupplierShipmentDefaults(
      { supplier_id: "supplier-1", type: "Frames", commodity: "Optical goods" },
      "supplier-1",
      { type: "Lenses", commodity: "Lens blanks" },
    )).toEqual({ supplier_id: "supplier-1", type: "Frames", commodity: "Optical goods" });
  });

  it("fills blank fields independently from non-empty history", () => {
    expect(mergeSupplierShipmentDefaults(
      { supplier_id: "supplier-1", type: "", commodity: "Entered commodity" },
      "supplier-1",
      { type: "Lenses", commodity: "Historical commodity" },
    )).toEqual({ supplier_id: "supplier-1", type: "Lenses", commodity: "Entered commodity" });
  });

  it("ignores a stale response after a different supplier is selected", () => {
    const current = { supplier_id: "supplier-2", type: "", commodity: "" };
    expect(mergeSupplierShipmentDefaults(current, "supplier-1", { type: "Lenses", commodity: "Lens blanks" }))
      .toBe(current);
  });
});
