import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DEFAULT_ADVICE_RULES, lensAdvice, materialIndex, type AdviceInput } from "@/features/rx-order/domain/advice";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { useRxOrderForm } from "@/features/rx-order/form/useRxOrderForm";
import type { RxCatalog } from "@/features/rx-order/form/types";

const materials = [
  { id: "cr", n: "Plastic 1.50" }, { id: "poly", n: "Polycarbonate" }, { id: "m160", n: "High Index 1.60" }, { id: "m167", n: "High Index 1.67" },
];
const combos = materials.map((m) => ({ m: m.id, d: "sv", c: "clear" }));
const row = (sph: number) => ({ sph, cyl: 0, axis: null, add: null, prism: null, base: "", pd: 32, npd: null, ht: null });
const input = (over: Partial<AdviceInput> = {}): AdviceInput => ({
  eyes: ["od", "os"], rows: { od: row(-2), os: row(-2) }, mount: "plastic", ed: 55,
  sides: [{ m: "cr", d: "sv", c: "clear" }], materials, combos, treatments: [{ id: "thin", n: "Optimised thinning" }], selectedTreatments: [], ...over,
});

describe("materialIndex", () => {
  it.each([["Plastic 1.50", 1.5], ["High Index 1.67", 1.67], ["Polycarbonate", 1.59], ["Trivex", 1.53], ["Mystery glass", null]])("%s", (name, idx) => {
    expect(materialIndex(name)).toBe(idx);
  });
});

describe("lensAdvice", () => {
  it("says nothing for an ordinary order, or before a lens is chosen", () => {
    expect(lensAdvice(input())).toEqual([]);
    expect(lensAdvice(input({ sides: [{ m: "", d: "", c: "" }], rows: { od: row(-9), os: row(-9) } }))).toEqual([]);
  });

  it("suggests the lowest index that clears the bar when the power is high", () => {
    const [a] = lensAdvice(input({ rows: { od: row(-7), os: row(-6.5) } }));
    expect(a.id).toBe("high_power_index");
    expect(a.action).toEqual({ kind: "material", id: "m160", label: "Switch to High Index 1.60" });
  });

  it("does not suggest what the person already has", () => {
    expect(lensAdvice(input({ sides: [{ m: "m167", d: "sv", c: "clear" }], rows: { od: row(-9), os: row(-9) } })).map((a) => a.id)).not.toContain("high_power_index");
  });

  it("only offers materials this design is made in", () => {
    const [a] = lensAdvice(input({ rows: { od: row(-7), os: row(-7) }, combos: combos.filter((c) => c.m !== "m160") }));
    expect(a.action).toMatchObject({ id: "m167" });
  });

  it("wants impact-resistant material in a rimless or grooved frame, but not for a plastic frame", () => {
    const rimless = lensAdvice(input({ mount: "rimless" }));
    expect(rimless[0]).toMatchObject({ id: "rimless_impact", action: { kind: "material", id: "poly" } });
    expect(lensAdvice(input({ mount: "grooved" }))[0].id).toBe("rimless_impact");
    expect(lensAdvice(input({ mount: "plastic" }))).toEqual([]);
    expect(lensAdvice(input({ mount: "rimless", sides: [{ m: "poly", d: "sv", c: "clear" }] }))).toEqual([]);
  });

  it("warns about a thick edge with no switch to offer", () => {
    const a = lensAdvice(input({ ed: 68, rows: { od: row(-4.5), os: row(-4.5) } })).find((x) => x.id === "large_ed_thickness");
    expect(a).toBeDefined();
    expect(a?.action).toBeUndefined();
  });

  it("offers the thinning add-on at high power, until it is taken", () => {
    const high = { rows: { od: row(-7), os: row(-7) } };
    expect(lensAdvice(input(high)).find((x) => x.id === "thinning_addon")?.action).toEqual({ kind: "treatment", id: "thin", label: "Add Optimised thinning" });
    expect(lensAdvice(input({ ...high, selectedTreatments: ["thin"] })).some((x) => x.id === "thinning_addon")).toBe(false);
  });

  it("follows the editable thresholds, and an inactive rule is silent", () => {
    const loose = DEFAULT_ADVICE_RULES.map((r) => (r.code === "high_power_index" ? { ...r, params: { ...r.params, min_sph: 3 } } : r));
    expect(lensAdvice(input({ rows: { od: row(-3.5), os: row(-3.5) } }), loose).some((x) => x.id === "high_power_index")).toBe(true);
    const off = DEFAULT_ADVICE_RULES.map((r) => ({ ...r, active: false }));
    expect(lensAdvice(input({ rows: { od: row(-9), os: row(-9) }, mount: "rimless" }), off)).toEqual([]);
  });

  it("measures the power across only the eyes being supplied", () => {
    expect(lensAdvice(input({ eyes: ["od"], rows: { od: row(-2), os: row(-9) } })).some((x) => x.id === "high_power_index")).toBe(false);
  });
});

describe("advice in the form", () => {
  const catalog = {
    materials, designs: [{ id: "sv", n: "Single Vision", v: "sv", base: 0 }], colours: [{ id: "clear", n: "Clear", up: 0 }], combos,
    treatments: [], clashes: [], lensPrice: () => 100, hasPriceSource: true, blockUnpricedOrders: false, surchargeRules: DEFAULT_SURCHARGE_RULES,
    accountCountry: "BB", pricesVisible: true,
  } as unknown as RxCatalog;
  const mount = () => renderHook(() => useRxOrderForm({ catalog, accountId: 1 }));

  it("shows a tip, applies it in one tap, and remembers a dismissal", () => {
    const { result } = mount();
    act(() => {
      result.current.pickLens("od", "m", "cr");
      result.current.pickLens("od", "d", "sv");
      result.current.pickLens("od", "c", "clear");
      for (const e of ["od", "os"] as const) result.current.set(`rx.${e}.sph`, "-7.00");
    });
    expect(result.current.derived.advice.map((a) => a.id)).toContain("high_power_index");
    act(() => { result.current.applyAdvice(result.current.derived.advice[0]); });
    expect(result.current.values.lens.od.m).toBe("m160");
    expect(result.current.derived.advice.map((a) => a.id)).not.toContain("high_power_index");

    act(() => { result.current.pickLens("od", "m", "cr"); result.current.set("frame.mount", "rimless"); });
    expect(result.current.derived.advice.map((a) => a.id)).toContain("rimless_impact");
    act(() => result.current.dismissWarning("advice:rimless_impact"));
    expect(result.current.derived.advice.map((a) => a.id)).not.toContain("rimless_impact");
  });
});
