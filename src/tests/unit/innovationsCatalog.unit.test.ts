import { describe, expect, it } from "vitest";
import {
  buildInnovationsCatalog,
  comboKey,
  type CatalogAlias,
} from "@/features/rx-order/embed/innovations-catalog";

const alias = (over: Partial<CatalogAlias> = {}): CatalogAlias => ({
  alias: "0000226201370",
  style_code: "02262",
  style_description: "Endless Steady",
  color_code: "01370",
  color_description: "TGNS Gray",
  mf_type: "Progressive",
  pricing_key: "Plastic 1.50 | Progressive | Endless Steady",
  ...over,
});

describe("innovations catalogue", () => {
  it("offers real colours, not finish types", () => {
    const { data } = buildInnovationsCatalog([
      alias({ color_description: "TGNS Gray" }),
      alias({ alias: "0000226200000", color_description: "UNCoated", color_code: "00000" }),
    ]);

    expect(data.colours.map((c) => c.n)).toEqual(["UNCoated", "TGNS Gray"]);
    expect(data.colours.map((c) => c.n)).not.toContain("Semifinished");
  });

  it("puts clear or uncoated first — it is the default case", () => {
    const { data } = buildInnovationsCatalog([
      alias({ alias: "1", color_description: "TGNS Amber" }),
      alias({ alias: "2", color_description: "UNCoated" }),
      alias({ alias: "3", color_description: "Polar Gray-C" }),
    ]);

    expect(data.colours[0].n).toBe("UNCoated");
  });

  it("derives the material from the pricing_key segment, not material_description", () => {
    // pricing_key carries the CV-side label ("Poly"); material_description
    // carries the Innovations one ("Poly 1.59"). The matrix keys off the former.
    const { data } = buildInnovationsCatalog([
      alias({ pricing_key: "Poly | Progressive | Endless Steady" }),
    ]);

    expect(data.materials.map((m) => m.n)).toEqual(["Poly"]);
  });

  it("names a design from mf type and style, and segments it correctly", () => {
    const { data } = buildInnovationsCatalog([
      alias({ mf_type: "Progressive", style_description: "Endless Steady" }),
      alias({ alias: "2", mf_type: "Single Vision", style_description: "Regular",
              pricing_key: "Plastic 1.50 | Single Vision | Regular" }),
    ]);

    const progressive = data.designs.find((d) => d.n === "Progressive · Endless Steady");
    const single = data.designs.find((d) => d.n === "Single Vision · Regular");
    expect(progressive?.v).toBe("mf");
    expect(progressive?.prog).toBe(true);
    expect(single?.v).toBe("sv");
    expect(single?.prog).toBe(false);
  });

  it("treats bifocal and trifocal as multifocal", () => {
    const { data } = buildInnovationsCatalog([
      alias({ mf_type: "Bifocal", style_description: "Flat Top 28" }),
      alias({ alias: "2", mf_type: "Trifocal", style_description: "Flat Top 7x28" }),
    ]);

    expect(data.designs.every((d) => d.v === "mf")).toBe(true);
    // Neither is a progressive, so no corridor/fitting-height requirements.
    expect(data.designs.every((d) => d.prog === false)).toBe(true);
  });

  it("keeps the design id intact even though it contains a separator", () => {
    // designId is "mf|style"; a combo key that gets split back apart naively
    // would corrupt it and every lookup would miss.
    const { data, aliasIndex } = buildInnovationsCatalog([alias()]);
    const combo = data.combos[0];

    expect(combo.d).toBe("progressive|endless steady");
    expect(aliasIndex.get(comboKey(combo.m, combo.d, combo.c))?.alias).toBe("0000226201370");
  });

  it("indexes every selection to an orderable alias", () => {
    const { data, aliasIndex } = buildInnovationsCatalog([
      alias({ alias: "1", color_description: "TGNS Gray" }),
      alias({ alias: "2", color_description: "TGNS Amber" }),
    ]);

    expect(data.combos).toHaveLength(2);
    for (const combo of data.combos) {
      expect(aliasIndex.get(comboKey(combo.m, combo.d, combo.c))).toBeDefined();
    }
  });

  it("narrows designs and colours per material", () => {
    const { data } = buildInnovationsCatalog([
      alias({ alias: "1", pricing_key: "Plastic 1.50 | Progressive | Endless Steady" }),
      alias({ alias: "2", pricing_key: "Poly | Single Vision | Regular",
              mf_type: "Single Vision", style_description: "Regular", color_description: "UNCoated" }),
    ]);

    expect(data.matrix["plastic 1.50"].d).toEqual(["progressive|endless steady"]);
    expect(data.matrix["plastic 1.50"].c).toEqual(["tgns gray"]);
    expect(data.matrix["poly"].c).toEqual(["uncoated"]);
  });

  it("resolves a colour offered under two style codes deterministically, and reports it", () => {
    // The real case: one style name spanning two Innovations style codes.
    const { aliasIndex, ambiguous } = buildInnovationsCatalog([
      alias({ alias: "0000228500001", style_code: "02285", color_description: "SRCoated" }),
      alias({ alias: "0000226200001", style_code: "02262", color_description: "SRCoated" }),
    ]);

    const key = comboKey("plastic 1.50", "progressive|endless steady", "srcoated");
    expect(aliasIndex.get(key)?.alias).toBe("0000226200001"); // lowest wins
    expect(ambiguous).toEqual([{ key, aliases: ["0000226200001", "0000228500001"] }]);
  });

  it("skips rows that cannot produce all three axes", () => {
    const { data } = buildInnovationsCatalog([
      alias({ pricing_key: "" }),
      alias({ alias: "2", color_description: "" }),
    ]);

    expect(data.combos).toHaveLength(0);
  });
});
