import { describe, expect, it } from "vitest";
import { classifyLensRows, combosFromRows, lensIdFor, type LensRow } from "@/lib/pricing/combos";

// BS1-05: combosFromRows is ported from optilens-connector.js. These fixtures
// cover the aggregation behavior that explained the "multiple lenses rows
// per supplier per combo" finding from the live-data check in BS1-01/02.

const row = (over: Partial<LensRow>): LensRow => ({
  id: crypto.randomUUID(),
  name: "1.50 FIN SV Regular Clear",
  supplier: "TOG Rx Lab",
  brand: null,
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

describe("classifyLensRows: per-row reason tracking for the review page", () => {
  it("classifies a normal row exactly like combosFromRows would count it", () => {
    const [result] = classifyLensRows([row({})]);
    expect(result.status).toBe("classified");
    expect(result.comboKey).toBe("Clear||Single Vision - Regular||1.50");
  });

  it("reports unapproved_supplier before checking anything else", () => {
    const [result] = classifyLensRows([row({ supplier: "Some Unapproved Lab" })]);
    expect(result.status).toBe("unapproved_supplier");
  });

  it("reports inactive and excluded_from_anchor as distinct statuses", () => {
    const [inactive] = classifyLensRows([row({ active: false })]);
    expect(inactive.status).toBe("inactive");
    const [excluded] = classifyLensRows([row({ excludedFromAnchor: true })]);
    expect(excluded.status).toBe("excluded_from_anchor");
  });

  it("reports invalid_cost for zero/negative/missing cost", () => {
    const [result] = classifyLensRows([row({ cost: 0 })]);
    expect(result.status).toBe("invalid_cost");
  });

  it("reports unmapped_tier for a design not in TIER_MAP, with no combo key guessed", () => {
    const [result] = classifyLensRows([row({ mftype: "Nonsense", lenstype: "Whatever" })]);
    expect(result.status).toBe("unmapped_tier");
    expect(result.comboKey).toBeNull();
  });

  it("reports quote_only for a QUOTE_ONLY design, not unmapped_tier — it's intentional, not a gap", () => {
    // Progressive|Individual FF is in QUOTE_ONLY and also absent from
    // TIER_MAP — found live 2026-07-15 via this exact page misreporting it
    // as an unmapped design when it's actually a deliberate exclusion.
    const [result] = classifyLensRows([row({ mftype: "Progressive", lenstype: "Individual FF" })]);
    expect(result.status).toBe("quote_only");
  });

  it("reports unmapped_material once tier is known but material can't be parsed from the name", () => {
    const [result] = classifyLensRows([row({ name: "Mystery Lens With No Index Token", material: null })]);
    expect(result.status).toBe("unmapped_material");
    expect(result.tier).toBe("Single Vision - Regular"); // tier still resolved, only material failed
  });
});
