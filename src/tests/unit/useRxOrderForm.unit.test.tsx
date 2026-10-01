import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { useRxOrderForm } from "@/features/rx-order/form/useRxOrderForm";
import type { RxCatalog } from "@/features/rx-order/form/types";

const catalog: RxCatalog = {
  materials: [{ id: "plastic", n: "Plastic 1.50", up: 0 }, { id: "poly", n: "Polycarbonate", up: 0 }],
  designs: [{ id: "sv", n: "Single Vision", v: "sv", base: 0 }, { id: "prog", n: "Progressive", v: "mf", base: 0, prog: true, needsAdd: true }],
  colours: [{ id: "clear", n: "Clear", up: 0 }, { id: "photo", n: "Photochromic Grey", up: 0 }],
  combos: [
    { m: "plastic", d: "sv", c: "clear" }, { m: "plastic", d: "sv", c: "photo" },
    { m: "poly", d: "sv", c: "clear" }, { m: "plastic", d: "prog", c: "clear" },
  ],
  treatments: [
    { id: "ar1", c: "Anti-reflective", n: "Super AR", d: "", p: 48, grp: "ar" },
    { id: "ar2", c: "Anti-reflective", n: "Blue AR", d: "", p: 62, grp: "ar" },
    { id: "tint", c: "Tints", n: "Solid Tint", d: "", p: 22, grp: "tn" },
  ],
  clashes: [],
  lensPrice: () => 100,
  hasPriceSource: true,
  blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES,
  accountCountry: "BB",
  pricesVisible: true,
};

const mount = (over: Partial<RxCatalog> = {}) =>
  renderHook(() => useRxOrderForm({ catalog: { ...catalog, ...over }, accountId: 776 }));

describe("useRxOrderForm", () => {
  it("starts empty and becomes complete as the form is filled", () => {
    const { result } = mount();
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.derived.canSubmit).toBe(false);

    act(() => {
      result.current.set("patient", { first: "Ann", last: "Lee" });
      result.current.setFrame("name", "Ray");
      result.current.setFrame("mount", "plastic");
      result.current.setFrame("a", "52");
      result.current.setFrame("b", "38");
      result.current.setFrame("dbl", "18");
      result.current.pickLens("od", "m", "plastic");
      result.current.pickLens("od", "d", "sv");
      result.current.pickLens("od", "c", "clear");
      for (const e of ["od", "os"] as const) {
        result.current.setRxText(e, "sph", "-2");
        result.current.setRxText(e, "pd", "32");
      }
      result.current.set("lens.diameter", "70");
    });
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.values.frame.ed).toBe("64.5"); // estimated from A and B
    // typed Rx is only normalised once the person leaves the field
    expect(result.current.values.rx.od.sph).toBe("-2");
    act(() => { result.current.blurRx("od", "sph"); result.current.blurRx("od", "pd"); });
    expect(result.current.values.rx.od.sph).toBe("-2.00");
    expect(result.current.values.rx.od.pd).toBe("32.0");
    expect(result.current.derived.sections.rx).toBe(true);
    expect(result.current.derived.canSubmit).toBe(true);
    expect(result.current.derived.price.sub).toBeCloseTo(100, 6);
  });

  it("splits a binocular PD between the eyes and says so", () => {
    const { result } = mount();
    let note: string | null = null;
    act(() => { result.current.setRxText("od", "pd", "63"); });
    act(() => { note = result.current.blurRx("od", "pd"); });
    expect(note).toBe("Binocular 63.0 split to 31.5 / 31.5");
    expect(result.current.values.rx.od.pd).toBe("31.5");
    expect(result.current.values.rx.os.pd).toBe("31.5");
  });

  it("narrows the lens catalogue and clears the oldest conflicting pick, saying what it cleared", () => {
    const { result } = mount();
    act(() => { result.current.pickLens("od", "m", "poly"); result.current.pickLens("od", "d", "sv"); });
    let note: string | null = null;
    act(() => { note = result.current.pickLens("od", "c", "photo"); });
    // polycarbonate has no photochromic: the pick that conflicts is dropped
    expect(note).toMatch(/^Cleared /);
    act(() => { result.current.setJob("vision", "mf"); });
    // a single-vision design is not valid on a multifocal job
    expect(result.current.values.lens.od.d).toBe("");
  });

  it("replaces a coating in the same group and keeps single vs split lens state consistent", () => {
    const { result } = mount();
    act(() => { result.current.toggleCoating("ar1"); });
    act(() => { result.current.toggleCoating("ar2"); });
    expect(result.current.values.treatments).toEqual(["ar2"]);
    act(() => { result.current.setSplit(true); result.current.copyLensToOs(); });
    expect(result.current.values.lens.split).toBe(true);
    act(() => { result.current.setJob("eyes", "od"); });
    expect(result.current.values.lens.split).toBe(false);
  });

  it("blocks a tint on a photochromic lens with the reason", () => {
    const { result } = mount();
    act(() => {
      result.current.pickLens("od", "m", "plastic");
      result.current.pickLens("od", "d", "sv");
      result.current.pickLens("od", "c", "photo");
    });
    let blocked: string | null = null;
    act(() => { blocked = result.current.toggleCoating("tint"); });
    expect(blocked).toBe("Cannot tint a photochromic lens");
    expect(result.current.values.treatments).toEqual([]);
  });

  it("converts plus-cylinder entry into the minus-cylinder table", () => {
    const { result } = mount();
    act(() => {
      result.current.togglePlusCyl(true);
      result.current.setPlusText("od", "sph", "-2");
      result.current.setPlusText("od", "cyl", "1");
      result.current.setPlusText("od", "axis", "90");
    });
    act(() => { result.current.blurPlus("od", "axis"); });
    expect(result.current.values.rx.od).toMatchObject({ sph: "-1.00", cyl: "-1.00", axis: "180" });
  });

  it("copies OD to OS, clears the Rx, and clears one section", () => {
    const { result } = mount();
    act(() => { result.current.setRxText("od", "sph", "-3.00"); result.current.copyOdToOs(); });
    expect(result.current.values.rx.os.sph).toBe("-3.00");
    act(() => { result.current.clearSection("rx"); });
    expect(result.current.values.rx.od.sph).toBe("");
    expect(result.current.values.rx.os.sph).toBe("");
  });

  it("defaults delivery to export for an overseas account until the person chooses", () => {
    const { result } = mount({ accountCountry: "JM" });
    expect(result.current.values.delivery.method).toBe("Export — freight forwarder");
    act(() => { result.current.setDelivery({ method: "Collect from lab", methodTouched: true }); });
    expect(result.current.values.delivery.method).toBe("Collect from lab");
  });

  describe("flags from a capture", () => {
    const flagged = () => {
      const h = mount();
      act(() => h.result.current.set("flags", [
        { path: "rx.od.sph", reason: "read as 1.25, low confidence" },
        { path: "patient.first", reason: "handwriting unclear" },
        { path: "rx.od.axis", reason: "faint" },
      ]));
      return h;
    };

    it("editing a flagged field clears only its flag", () => {
      const { result } = flagged();
      act(() => result.current.setRxText("od", "sph", "-1.50"));
      expect(result.current.values.flags.map((f) => f.path)).toEqual(["patient.first", "rx.od.axis"]);
    });

    it("leaving a field with the value unchanged keeps its flag", () => {
      const { result } = flagged();
      act(() => result.current.set("rx.od.axis", ""));
      expect(result.current.values.flags.map((f) => f.path)).toContain("rx.od.axis");
    });

    it("replacing a whole row clears the flags beneath it", () => {
      const { result } = flagged();
      act(() => result.current.set("rx.od", { ...result.current.values.rx.od, sph: "-1.00", axis: "90" }));
      expect(result.current.values.flags.map((f) => f.path)).toEqual(["patient.first"]);
    });

    it("Looks right clears one flag; All look right clears the rest", () => {
      const { result } = flagged();
      act(() => result.current.confirmFlag("patient.first"));
      expect(result.current.values.flags).toHaveLength(2);
      act(() => result.current.confirmAllFlags());
      expect(result.current.values.flags).toEqual([]);
    });
  });
});
