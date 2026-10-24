import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("the pricelist properties dialog", () => {
  it("routes unchanged adjustments through metadata update and exposes the guarded replace choice", () => {
    const source = read("src/components/admin/PricelistVersionsSection.tsx");
    expect(source).toContain("updateMutation.mutate");
    expect(source).toContain("nextSignature === originalAdjustmentSignature");
    expect(source).toContain("PricelistAdjustmentSaveDialog");
    expect(source).toContain("saveEditedPricelist(true, true)");
  });
});
