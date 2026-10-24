import { describe, expect, it } from "vitest";
import { applyLocalResolution, mapExtractionToDraft, splitName } from "../../../supabase/functions/_shared/rx-capture/extraction";
import { upgradeV1 } from "@/features/rx-order/domain/schema";
import { valuesFromOrder } from "@/features/rx-order/form/model";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import type { RxCatalog } from "@/features/rx-order/form/types";
import { extensionFor, filesFromClipboard, isAcceptedFile } from "@/features/rx-capture/files";

const eye = (o: Record<string, string> = {}) => ({ sphere: "", cylinder: "", axis: "", add: "", prism: "", base: "", ...o });
const sheet = (over: Record<string, unknown> = {}) => ({
  patient: { name: "GRANT, MARCUS", reference: "JOB-9" },
  prescription: { od: eye({ sphere: "-2.00", cylinder: "-0.75", axis: "90" }), os: eye({ sphere: "-1.75", cylinder: "-0.50", axis: "85" }) },
  pd: { binocular: "", od: "32", os: "31.5", nearOd: "", nearOs: "" },
  frame: { status: "TO_BE_TRACED", mounting: "2", model: "Ray-Ban RB5154", color: "Black", a: "52", b: "38", dbl: "18", ed: "", segHeightOd: "", segHeightOs: "" },
  lensRequest: { lensType: "", design: "", material: "", option: "", coating: "" },
  instructions: "",
  uncertainFields: [],
  ...over,
});

describe("mapExtractionToDraft", () => {
  it("maps a clean sheet to a payload the form can load", () => {
    const { payload, flags } = mapExtractionToDraft(sheet() as never);
    const order = upgradeV1(payload);
    expect(order.patient).toEqual({ first: "Marcus", last: "Grant" });
    expect(order.reference).toBe("JOB-9");
    expect(order.rx.od).toMatchObject({ sph: -2, cyl: -0.75, axis: 90, pd: 32 });
    expect(order.rx.os).toMatchObject({ sph: -1.75, pd: 31.5 });
    expect(order.frame).toMatchObject({ name: "Ray-Ban RB5154 Black", mount: "plastic", a: 52, b: 38, dbl: 18 });
    expect(order.job).toMatchObject({ eyes: "pair", vision: "sv" });
    expect(flags).toEqual([]);
  });

  it("flags what the model was unsure of, at the form's paths", () => {
    const { flags } = mapExtractionToDraft(sheet({ uncertainFields: ["prescription.od.sphere", "pd.nearOs", "patient.name"] }) as never);
    expect(flags.map((f) => f.path)).toEqual(["rx.od.sph", "rx.os.npd", "patient.first"]);
  });

  it("does not drop an unreadable value silently — it is flagged", () => {
    const { payload, flags } = mapExtractionToDraft(sheet({ prescription: { od: eye({ sphere: "-2.O0", cylinder: "-0.50", axis: "200" }), os: eye({ sphere: "-1" }) } }) as never);
    expect(flags.map((f) => f.path)).toEqual(expect.arrayContaining(["rx.od.sph", "rx.od.axis"]));
    expect(upgradeV1(payload).rx.od).toMatchObject({ sph: null, axis: null });
  });

  it("splits a binocular PD and says so", () => {
    const { payload, flags } = mapExtractionToDraft(sheet({ pd: { binocular: "63", od: "", os: "", nearOd: "", nearOs: "" } }) as never);
    expect(upgradeV1(payload).rx.od?.pd).toBe(31.5);
    expect(flags.some((f) => f.path === "rx.od.pd" && /split evenly/.test(f.reason))).toBe(true);
  });

  it("an ADD makes it multifocal; one readable eye makes it a single-lens order", () => {
    const mf = mapExtractionToDraft(sheet({ prescription: { od: eye({ sphere: "+1", add: "+2.00" }), os: eye() } }) as never);
    expect(mf.payload.job).toMatchObject({ vision: "mf", eyes: "od" });
  });

  it("keeps the sheet's lens wording in the notes and asks for a pricelist choice", () => {
    const { payload, flags } = mapExtractionToDraft(sheet({ lensRequest: { lensType: "Progressive", design: "", material: "1.67", option: "", coating: "AR" }, instructions: "Rush" }) as never);
    expect(upgradeV1(payload).delivery.notes).toBe("As written on the sheet — Type: Progressive · Material: 1.67 · Coating: AR\nRush");
    expect(flags.map((f) => f.path)).toContain("lens.od.d");
  });

  it("rimless / grooved is a question, not a guess", () => {
    const { payload, flags } = mapExtractionToDraft(sheet({ frame: { ...sheet().frame, mounting: "3" } }) as never);
    expect(upgradeV1(payload).frame.mount).toBe("");
    expect(flags.map((f) => f.path)).toContain("frame.mount");
  });

  it("survives a model that returned nothing useful", () => {
    const { payload } = mapExtractionToDraft(null);
    expect(() => upgradeV1(payload)).not.toThrow();
  });
});

describe("splitName", () => {
  it.each([["GRANT, MARCUS", "MARCUS", "GRANT"], ["Marcus Grant", "Marcus", "Grant"], ["Grant", "", "Grant"], ["", "", ""]])("%s", (raw, first, last) => {
    expect(splitName(raw)).toEqual({ first, last });
  });
});

describe("capture files", () => {
  const f = (type: string) => new File(["x"], "a", { type });
  it("accepts photos and PDFs only", () => {
    expect(isAcceptedFile(f("image/jpeg"))).toBe(true);
    expect(isAcceptedFile(f("application/pdf"))).toBe(true);
    expect(isAcceptedFile(f("audio/webm"))).toBe(false);
    expect(isAcceptedFile(f("text/plain"))).toBe(false);
  });
  it("names the stored file by type", () => {
    expect(extensionFor(f("application/pdf"))).toBe("pdf");
    expect(extensionFor(f("image/png"))).toBe("png");
    expect(extensionFor(f("image/jpeg"))).toBe("jpg");
  });
  it("takes pasted images, ignoring pasted text", () => {
    const data = { items: [{ kind: "string", getAsFile: () => null }, { kind: "file", getAsFile: () => f("image/png") }] } as unknown as DataTransfer;
    expect(filesFromClipboard(data)).toHaveLength(1);
    expect(filesFromClipboard(null)).toEqual([]);
  });
});

describe("applyLocalResolution (an office-reviewed order)", () => {
  const resolved = (r: Record<string, unknown>, over: Record<string, unknown> = {}) =>
    applyLocalResolution(mapExtractionToDraft(sheet({ uncertainFields: ["prescription.od.sphere"], ...over }) as never), r as never);

  it("takes the reviewer's choices and drops the hard-to-read flags", () => {
    const { payload, flags } = resolved({ lensAlias: "1234567890123", frameMode: "edged", frameMounting: "1", coatingSku: "AR-1", addonSkus: ["TINT-2"], instructions: "Rush" });
    expect(flags).toEqual([]);
    expect(payload.flags).toEqual([]);
    expect((payload.lens as any).innovationsAlias).toBe("1234567890123");
    expect(payload.job).toMatchObject({ scope: "glaze" });
    expect((payload.frame as any).mount).toBe("metal");
    expect((payload.delivery as any).notes).toBe("Office-selected coating / add-on SKUs: AR-1, TINT-2\nRush");
  });

  it("a frame the office has not edged stays uncut, and rimless stays a question for the form", () => {
    const { payload } = resolved({ frameMode: "uncut", frameMounting: "3" });
    expect(payload.job).toMatchObject({ scope: "uncut" });
    expect((payload.frame as any).mount).toBe("");
  });

  it("works with no resolution at all", () => {
    expect(() => applyLocalResolution(mapExtractionToDraft(sheet() as never), null)).not.toThrow();
  });
});

describe("an alias on the payload fills the lens from the account catalogue", () => {
  const catalog = {
    materials: [{ id: "m1", n: "Plastic", up: 0 }], designs: [{ id: "d1", n: "SV", v: "sv", base: 0 }], colours: [{ id: "c1", n: "Clear", up: 0 }],
    combos: [{ m: "m1", d: "d1", c: "c1" }], treatments: [], clashes: [], lensPrice: () => 100, hasPriceSource: true, blockUnpricedOrders: false,
    surchargeRules: DEFAULT_SURCHARGE_RULES, accountCountry: "BB", pricesVisible: true,
    tripleForAlias: (a: string) => (a === "1234567890123" ? { m: "m1", d: "d1", c: "c1" } : null),
  } as unknown as RxCatalog;
  const draft = (alias: string) => applyLocalResolution(mapExtractionToDraft(sheet() as never), { lensAlias: alias }).payload;

  it("resolves a known alias", () => {
    expect(valuesFromOrder(draft("1234567890123"), catalog).lens.od).toEqual({ m: "m1", d: "d1", c: "c1" });
  });
  it("leaves the lens to be chosen when the alias is not on this account", () => {
    expect(valuesFromOrder(draft("9999999999999"), catalog).lens.od).toEqual({ m: "", d: "", c: "" });
  });
});
