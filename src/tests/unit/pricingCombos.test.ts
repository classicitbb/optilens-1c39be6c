import { describe, expect, it } from "vitest";
import { combosFromRows, lensIdFor, type LensRow } from "@/lib/pricing/combos";

// BS1-05: combosFromRows is ported from optilens-connector.js. These fixtures
// cover the aggregation behavior that explained the "multiple lenses rows
// per supplier per combo" finding from the live-data check in BS1-01/02.

const row = (over: Partial<LensRow>): LensRow => ({
  id: crypto.randomUUID(),
  name: "1.50 FIN SV Regular Clear",
  supplier: "TOG Rx Lab",
  mftype: "Single Vision",
  lenstype: "Regular",
  material: "Plastic 1.50",
  cost: 20,
  active: true,
  ...over,
});

describe("combosFromRows", () => {
  it("filters to approved suppliers only", () => {
    const rows = [row({ supplier: "Some Unapproved Lab" })];
    const { combos, approved } = combosFromRows(rows);
    expect(approved).toBe(0);
    expect(combos).toHaveLength(0);
  });

  it("drops inactive rows and non-positive costs", () => {
    const rows = [row({ active: false }), row({ cost: 0 }), row({ cost: null })];
    const { combos } = combosFromRows(rows);
    expect(combos).toHaveLength(0);
  });

  it("skips rows whose mftype|lenstype isn't in TIER_MAP (unmapped, not an error)", () => {
    const rows = [row({ mftype: "Nonsense", lenstype: "Whatever" })];
    const { combos, mapped } = combosFromRows(rows);
    expect(mapped).toBe(0);
    expect(combos).toHaveLength(0);
  });

  it("classifies tier/treatment/material and builds the combo key", () => {
    const rows = [row({})];
    const { combos } = combosFromRows(rows);
    expect(combos).toHaveLength(1);
    expect(combos[0].key).toBe("Clear||Single Vision - Regular||1.50");
    expect(combos[0].treatment).toBe("Clear");
    expect(combos[0].tier).toBe("Single Vision - Regular");
    expect(combos[0].material).toBe("1.50");
  });

  it("takes the CHEAPEST row per supplier within one combo, not the last or first", () => {
    const cheapestId = crypto.randomUUID();
    const rows = [
      row({ name: "1.50 FIN SV Regular Clear AR", cost: 25 }),
      row({ id: cheapestId, name: "1.50 FIN SV Regular Clear UC", cost: 12 }),
      row({ name: "1.50 FIN SV Regular Clear HC", cost: 18 }),
    ];
    const { combos } = combosFromRows(rows);
    expect(combos).toHaveLength(1);
    expect(combos[0].suppliers["TOG Rx Lab"]).toBe(12);
    expect(combos[0].provenance["TOG Rx Lab"].rowCount).toBe(3);
    // lensIdFor must track the SAME row the cheapest cost came from, so
    // allocating "TOG Rx Lab" for this combo points at the $12 row, not
    // whichever row happened to be seen first.
    expect(lensIdFor(combos[0], "TOG Rx Lab")).toBe(cheapestId);
  });

  it("computes anchor (most expensive) and cheapest across suppliers", () => {
    const rows = [
      row({ supplier: "TOG Rx Lab", cost: 20 }),
      row({ supplier: "SkyLab", cost: 55 }),
      row({ supplier: "Optex Laboratories", cost: 30 }),
    ];
    const { combos } = combosFromRows(rows);
    expect(combos[0].anchorSupplier).toBe("SkyLab");
    expect(combos[0].anchorCost).toBe(55);
    expect(combos[0].cheapestSupplier).toBe("TOG Rx Lab");
    expect(combos[0].cheapestCost).toBe(20);
    expect(combos[0].supplierCount).toBe(3);
  });

  it("provenance keeps only the top 6 cheapest rows per supplier", () => {
    const rows = Array.from({ length: 9 }, (_, i) => row({ name: `variant ${i}`, cost: 10 + i }));
    const { combos } = combosFromRows(rows);
    expect(combos[0].provenance["TOG Rx Lab"].allRows).toHaveLength(6);
    expect(combos[0].provenance["TOG Rx Lab"].allRows[0].cost).toBe(10);
  });
});
