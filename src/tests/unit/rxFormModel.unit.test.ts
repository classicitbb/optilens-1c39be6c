import { describe, expect, it } from "vitest";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import {
  accountIsExport, addonIssues, buildOrder, clashOf, derive, estimateED, firstIncomplete,
  sectionSummary, toggleTreatment, valuesFromOrder,
} from "@/features/rx-order/form/model";
import { defaultValues, type RxCatalog, type RxFormValues } from "@/features/rx-order/form/types";
import { upgradeV1 } from "@/features/rx-order/domain/schema";
import { downgradeToV1 } from "@/features/rx-order/domain/payload";

const catalog = (over: Partial<RxCatalog> = {}): RxCatalog => ({
  materials: [{ id: "plastic", n: "Plastic 1.50", up: 0 }, { id: "poly", n: "Polycarbonate", up: 0 }],
  designs: [
    { id: "sv", n: "Single Vision", v: "sv", base: 0 },
    { id: "prog", n: "Progressive", v: "mf", base: 0, prog: true, needsAdd: true },
  ],
  colours: [{ id: "clear", n: "Clear", up: 0 }, { id: "photo", n: "Photochromic Grey", up: 0 }],
  combos: [
    { m: "plastic", d: "sv", c: "clear" }, { m: "plastic", d: "sv", c: "photo" },
    { m: "poly", d: "sv", c: "clear" }, { m: "plastic", d: "prog", c: "clear" },
  ],
  treatments: [
    { id: "ar1", c: "Anti-reflective", n: "Super AR", d: "", p: 48, grp: "ar", pop: true },
    { id: "ar2", c: "Anti-reflective", n: "Blue AR", d: "", p: 62, grp: "ar" },
    { id: "tint", c: "Tints", n: "Solid Tint", d: "", p: 22, grp: "tn" },
    { id: "mirror", c: "Mirror", n: "Silver Mirror", d: "", p: 55, grp: "mr" },
    { id: "free", c: "Specialty", n: "Mystery", d: "", p: 0, unpriced: true },
  ],
  clashes: [["mirror", "tint", "A mirror cannot go over a tint"]],
  lensPrice: () => 100,
  hasPriceSource: true,
  blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES,
  accountCountry: "BB",
  pricesVisible: true,
  ...over,
});

const valid = (): RxFormValues => {
  const v = defaultValues(776);
  v.patient = { first: "Ann", last: "Lee" };
  v.frame = { ...v.frame, name: "Ray", mount: "plastic", a: "52", b: "38", dbl: "18" };
  v.lens.od = { m: "plastic", d: "sv", c: "clear" };
  v.lens.diameter = "70"; // a fixed blank keeps these prices free of the oversize charge
  for (const e of ["od", "os"] as const) v.rx[e] = { ...v.rx[e], sph: "-2.00", cyl: "-0.75", axis: "90", pd: "32.0" };
  return v;
};

describe("derive", () => {
  it("a complete single-vision pair is valid, priced and submittable", () => {
    const d = derive(valid(), catalog());
    expect(d.sections).toEqual({ patient: true, frame: true, lens: true, rx: true, treat: true, notes: true });
    expect(d.canSubmit).toBe(true);
    expect(firstIncomplete(d.sections)).toBeNull();
    expect(d.price.ready).toBe(true);
    expect(d.price.sub).toBeCloseTo(100, 6);
    expect(d.frame).toMatchObject({ a: 52, b: 38, dbl: 18, ed: estimateED(52, 38), edIsEstimate: true });
  });

  it("reports the first incomplete section and what is missing", () => {
    const v = valid(); v.patient.last = "";
    const d = derive(v, catalog());
    expect(firstIncomplete(d.sections)).toBe("patient");
    expect(d.checklist.find((c) => c.id === "patient")?.ok).toBe(false);
    expect(d.canSubmit).toBe(false);
    const v2 = valid(); v2.rx.od.pd = "";
    expect(derive(v2, catalog()).sections.rx).toBe(false);
  });

  it("a frame limit breach blocks the frame section", () => {
    const v = valid(); v.frame.a = "80";
    const d = derive(v, catalog());
    expect(d.sections.frame).toBe(false);
    expect(d.frame.issues[0].text).toMatch(/maximum we can cut is 78 mm/);
  });

  it("a progressive needs an add and a fitting height", () => {
    const v = valid(); v.job.vision = "mf"; v.lens.od = { m: "plastic", d: "prog", c: "clear" };
    const d = derive(v, catalog());
    expect(d.lens.isProg).toBe(true);
    expect(d.sections.rx).toBe(false);
    expect(d.rx.errors.map((e) => e.text)).toContain("OD add must be at least +0.25.");
    for (const e of ["od", "os"] as const) v.rx[e] = { ...v.rx[e], add: "+2.00", ht: "20" };
    expect(derive(v, catalog()).sections.rx).toBe(true);
  });

  it("an unpriced lens is flagged for assistance and blocks only when the switch is on", () => {
    const d = derive(valid(), catalog({ lensPrice: () => null }));
    expect(d.price.unpriced).toBe(true);
    expect(d.assistance).toContain("Lens not priced on this account — quote requested");
    expect(d.canSubmit).toBe(true);
    const blocked = derive(valid(), catalog({ lensPrice: () => null, blockUnpricedOrders: true }));
    expect(blocked.canSubmit).toBe(false);
    expect(blocked.blockedReason).toMatch(/save it as a draft/);
  });

  it("an identical split is a duplicate and blocks the lens section", () => {
    const v = valid(); v.lens.split = true; v.lens.os = { ...v.lens.od };
    expect(derive(v, catalog()).lens.duplicate).toBe(true);
    v.lens.os = { m: "poly", d: "sv", c: "clear" };
    const d = derive(v, catalog());
    expect(d.sections.lens).toBe(true);
    // each side is half its own pair price; two 100s add to 100
    expect(d.price.sub).toBeCloseTo(100, 6);
  });

  it("the blank size follows the frame and PD, and an explicit size wins", () => {
    const v = valid(); v.lens.diameter = "auto";
    const d = derive(v, catalog());
    expect(d.diameter.suggested).toBe(73); // ED 64.5 + 2 x 3 mm decentration + 2
    expect(d.diameter.pick).toBe(75);
    expect(d.diameter.effective).toBe(75);
    expect(d.price.lines.some((l) => l.surcharge === "oversize_blank")).toBe(true);
    v.lens.diameter = "80";
    expect(derive(v, catalog()).diameter.effective).toBe(80);
  });

  it("adds the priority surcharge and the AR lead time", () => {
    const v = valid(); v.delivery.service = "pri"; v.treatments = ["ar1"];
    const d = derive(v, catalog());
    expect(d.price.lines[d.price.lines.length - 1]?.n).toBe("Priority service");
    expect(d.treat.arSelected).toBe(true);
    expect(d.treat.serviceLead).toBe("9–14 working days");
  });
});

describe("coatings", () => {
  const c = catalog();
  it("choosing one coating in a group replaces the other", () => {
    expect(clashOf("ar2", ["ar1"], c, [])).toBe("Replaces Super AR");
    expect(toggleTreatment(["ar1"], "ar2", c, [])).toEqual({ treatments: ["ar2"] });
  });
  it("refuses a clashing pair and a tint on a photochromic lens", () => {
    expect(toggleTreatment(["tint"], "mirror", c, [])).toEqual({ blocked: "A mirror cannot go over a tint" });
    expect(toggleTreatment([], "tint", c, ["Photochromic Grey"])).toEqual({ blocked: "Cannot tint a photochromic lens" });
    expect(toggleTreatment([], "tint", c, ["Clear"])).toEqual({ treatments: ["tint"] });
  });
  it("removing a selected coating toggles it off", () => {
    expect(toggleTreatment(["ar1", "mirror"], "ar1", c, [])).toEqual({ treatments: ["mirror"] });
  });
  it("reports withdrawn, unpriced and clashing coatings as blocking issues", () => {
    const issues = addonIssues(["gone", "free", "tint", "mirror"], c);
    expect(issues.map((i) => i.kind).sort()).toEqual(["clash", "unpriced", "withdrawn"]);
    const v = valid(); v.treatments = ["free"];
    expect(derive(v, c).sections.treat).toBe(false);
    expect(derive(v, c).checklist.map((x) => x.id)).toContain("treat");
  });
});

describe("delivery and summaries", () => {
  it("defaults overseas accounts to export", () => {
    expect(accountIsExport("BB")).toBe(false);
    expect(accountIsExport("Barbados")).toBe(false);
    expect(accountIsExport("JM")).toBe(true);
    expect(accountIsExport(null)).toBe(false);
  });
  it("summarises a completed card in one line", () => {
    const v = valid(); const c = catalog(); const d = derive(v, c);
    expect(sectionSummary("patient", v, d, c)).toBe("Ann Lee");
    expect(sectionSummary("lens", v, d, c)).toBe("Plastic 1.50 · Single Vision · Clear");
    expect(sectionSummary("rx", v, d, c)).toContain("OD -2.00 / -0.75 × 90");
  });
});

describe("the order and back", () => {
  it("builds a valid cv.rxorder/2 order whose quote total is the sum of its lines", () => {
    const v = valid(); v.treatments = ["ar1"]; v.delivery.service = "pri";
    const c = catalog(); const d = derive(v, c);
    const order = buildOrder(v, d, c, { orderNo: "80000001", account: { id: 776, name: "Retail" }, source: "form" });
    expect(order.schema).toBe("cv.rxorder/2");
    expect(order.lens.od).toEqual(order.lens.os); // an unsplit pair repeats the lens
    const lines = (order.quote as any).lines as { amount: number }[];
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBeCloseTo((order.quote as any).total, 1);
    // and it downgrades to the v1 shape the save path reads
    const v1 = downgradeToV1(order) as any;
    expect(v1.job.eyes).toBe("pair");
    expect(v1.quote.lines.some((l: any) => l.lens)).toBe(true);
  });

  it("a saved order reopens to the same values", () => {
    const v = valid(); v.treatments = ["ar1"]; v.reference = "JOB-1"; v.delivery.notes = "rush";
    const c = catalog(); const d = derive(v, c);
    const order = buildOrder(v, d, c, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    const back = valuesFromOrder(order, c);
    expect(back.patient).toEqual(v.patient);
    expect(back.reference).toBe("JOB-1");
    expect(back.lens.od).toEqual(v.lens.od);
    expect(back.treatments).toEqual(["ar1"]);
    expect(back.rx.od).toMatchObject({ sph: "-2.00", cyl: "-0.75", axis: "90", pd: "32.0" });
    expect(back.frame).toMatchObject({ name: "Ray", a: "52", b: "38", dbl: "18", edTouched: false });
    expect(derive(back, c).sections).toEqual(d.sections);
  });

  it("hidden prices produce a hidden quote", () => {
    const c = catalog({ pricesVisible: false }); const v = valid();
    const order = buildOrder(v, derive(v, c), c, { orderNo: null, account: null, source: "portal" });
    expect(order.quote).toMatchObject({ hidden: true });
    expect(upgradeV1(order).source).toBe("portal");
  });
});
