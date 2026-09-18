import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getChargeAdvance } from "@/features/shipments/chargeKeyboard";

describe("getChargeAdvance", () => {
  it.each([
    ["type", { kind: "focus", chargeId: "one", field: "amount" }],
    ["amount", { kind: "focus", chargeId: "one", field: "vat" }],
    ["vat", { kind: "focus", chargeId: "one", field: "duty" }],
    ["duty", { kind: "focus", chargeId: "one", field: "reclaimable" }],
    ["reclaimable", { kind: "focus", chargeId: "one", field: "notes" }],
  ] as const)("advances from %s within the row", (field, expected) => {
    expect(getChargeAdvance(["one", "two"], "one", field)).toEqual(expected);
  });

  it("moves Notes to the next row's charge type", () => {
    expect(getChargeAdvance(["one", "two"], "one", "notes")).toEqual({ kind: "focus", chargeId: "two", field: "type" });
  });

  it("creates a row after Notes in the final row", () => {
    expect(getChargeAdvance(["one"], "one", "notes")).toEqual({ kind: "create" });
  });

  it("moves past the VAT reclaimable switch on Enter without toggling it", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/admin/costings/ShipmentDetailPage.tsx"), "utf8");
    const switchLine = page.split("\n").find((line) => line.includes('if (event.key === "Enter")') && line.includes('advanceCharge(c.id, "reclaimable")'));
    expect(switchLine).toBeDefined();
    const enterHandler = switchLine!.slice(switchLine!.indexOf("onKeyDown"));
    expect(enterHandler).not.toContain("vat_reclaimable");
  });
});
