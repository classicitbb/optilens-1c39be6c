import { describe, expect, it } from "vitest";
import { buildImportedLensVariants } from "@/features/store-variants/innovationsVariantImport";

describe("buildImportedLensVariants", () => {
  it("groups left/right OPC rows into one reviewable chiral grid record", () => {
    const result = buildImportedLensVariants([
      { id: "left", innovations_lens_id: "lens", diameter: 70, sphere: -2, base: null, cylinder: -1, add: null, stock_on_hand: 3, left_opc: "L", right_opc: null },
      { id: "right", innovations_lens_id: "lens", diameter: 70, sphere: -2, base: null, cylinder: -1, add: null, stock_on_hand: 4, left_opc: null, right_opc: "R" },
    ], { isChiral: true, rowLabel: "Sphere", columnLabel: "Cylinder", price: 99 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ stock_qty: 7, price: 99, attributes: { sphere: -2, cylinder: -1, diameter: 70 } });
    expect((result[0].metadata as any).opc_by_eye).toEqual({ left: "L", right: "R" });
  });
});
