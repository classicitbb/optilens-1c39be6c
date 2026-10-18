import { describe, expect, it } from "vitest";
import { buildInnovationsCatalog, type CatalogAlias } from "@/features/rx-order/embed/innovations-catalog";
import { indexPricelistLenses, pricelistLensOrderPath } from "@/features/rx-order/pricing/pricelistLenses";
import { valuesForPricelistLens } from "@/features/rx-order/prefill/pricelistLens";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import type { RxCatalog } from "@/features/rx-order/form/types";

const alias = (overrides: Partial<CatalogAlias> = {}): CatalogAlias => ({
  alias: "100", style_code: "PAL", style_description: "Classic PAL", color_code: "CLR",
  color_description: "SRCoated", mf_type: "Progressive", pricing_key: "Poly | Progressive | Classic PAL", ...overrides,
});

const allocation = { treatment_type: "clear", category: "progressive_good", material_index: "POLY", lens_id: "chosen" };
const link = (innovations_alias: string, is_primary = true, lens_id = "chosen") => ({ lens_id, innovations_alias, is_primary });

describe("pricelist to Rx catalog", () => {
  it("offers only the editor-selected lens despite other aliases sharing the cell", () => {
    const index = indexPricelistLenses([
      alias(), alias({ alias: "101", color_description: "UNCoated" }),
      alias({ alias: "102", pricing_key: "Polarized Poly | Progressive | Classic PAL", color_description: "Brown Gradient1" }),
      alias({ alias: "103", pricing_key: "Photochromic Poly | Progressive | Classic PAL", color_description: "NeoChrome Gray" }),
    ], [allocation], [link("100"), link("101", true, "other")]);
    expect(index.get("clear|progressive_good|POLY")).toEqual([
      { alias: "100", material: "Poly", design: "Progressive \u00b7 Classic PAL", colour: "SRCoated" },
    ]);
  });

  it("prefers the confirmed primary over other colours linked to that lens", () => {
    const index = indexPricelistLenses([alias(), alias({ alias: "101", color_description: "UNCoated" })], [allocation], [link("100"), link("101", false)]);
    expect(index.get("clear|progressive_good|POLY")?.map((lens) => lens.alias)).toEqual(["100"]);
  });

  it("keeps the form's canonical alias when duplicate aliases describe the same selection", () => {
    const aliases = [alias({ alias: "999" }), alias({ alias: "001" })];
    const canonical = [...buildInnovationsCatalog(aliases).aliasIndex.values()][0];
    expect(indexPricelistLenses(aliases, [allocation], [link("999")]).get("clear|progressive_good|POLY")).toMatchObject([{ alias: canonical.alias }]);
  });

  it("allows a unique confirmed mapping without a primary", () => {
    expect(indexPricelistLenses([alias()], [allocation], [link("100", false)]).get("clear|progressive_good|POLY")).toHaveLength(1);
  });

  it("does not guess without the selected lens or its mapping", () => {
    expect(indexPricelistLenses([alias()], [{ ...allocation, lens_id: null }], [link("100")]).size).toBe(0);
    expect(indexPricelistLenses([alias()], [allocation], []).size).toBe(0);
    expect(indexPricelistLenses([alias()], [allocation], [link("removed"), link("100", false)]).size).toBe(0);
  });

  it("does not replace ambiguous confirmed colours with an arbitrary selection", () => {
    expect(indexPricelistLenses([alias(), alias({ alias: "101", color_description: "UNCoated" })], [allocation], [link("100", false), link("101", false)]).size).toBe(0);
  });

  it("rejects mappings inconsistent with the selected matrix coordinates", () => {
    for (const changed of [{ category: "progressive_best" }, { treatment_type: "polarized" }, { material_index: "1.50" }]) {
      expect(indexPricelistLenses([alias()], [{ ...allocation, ...changed }], [link("100")]).size).toBe(0);
    }
  });

  it("keeps duplicate Trans Gen S treatment keys aligned with the price resolver", () => {
    const index = indexPricelistLenses([alias({ color_description: "TGNS Amber" })], [{ ...allocation, treatment_type: "trans_gen_s" }], [link("100")]);
    expect(index.get("trans_gen_s|progressive_good|POLY")).toHaveLength(1);
    expect(index.get("clear|progressive_good|POLY")).toBeUndefined();
  });

  it("carries only an encoded lens identity in the URL, never a client-supplied price", () => {
    expect(pricelistLensOrderPath("code&price=0")).toBe("/profile/rx-order?lens=code%26price%3D0");
  });
});

const catalog: RxCatalog = {
  materials: [{ id: "poly", n: "Poly" }], designs: [{ id: "pal", n: "Progressive · Classic PAL", v: "mf" }],
  colours: [{ id: "clear", n: "SRCoated" }], combos: [{ m: "poly", d: "pal", c: "clear" }],
  treatments: [], clashes: [], lensPrice: () => 100, hasPriceSource: true, blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES, accountCountry: "BB", pricesVisible: true,
  tripleForAlias: (id) => id === "100" ? { m: "poly", d: "pal", c: "clear" } : null,
};

describe("fresh pricelist order values", () => {
  it("sets the material, design, colour and vision type while keeping patient and Rx blank", () => {
    const values = valuesForPricelistLens("100", catalog, 776)!;
    expect(values.accountId).toBe(776);
    expect(values.job.vision).toBe("mf");
    expect(values.lens.od).toEqual({ m: "poly", d: "pal", c: "clear" });
    expect(values.patient).toEqual({ first: "", last: "" });
    expect(values.rx.od.sph).toBe("");
    expect(values.frame.name).toBe("");
    expect(values.treatments).toEqual([]);
    expect(values).not.toHaveProperty("price");
  });

  it("refuses a removed or invalid selection rather than silently substituting another lens", () => {
    expect(valuesForPricelistLens("unknown", catalog, 776)).toBeNull();
    expect(valuesForPricelistLens("100", { ...catalog, combos: [] }, 776)).toBeNull();
    expect(valuesForPricelistLens("100", { ...catalog, designs: [] }, 776)).toBeNull();
  });
});
