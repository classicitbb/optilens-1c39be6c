// What the React form hands to the REAL save path (persistPayload →
// save_rx_order): every priced line of the form's quote must become a saved line,
// surcharges citing their rule, so the saved total equals the quoted total.
import { describe, expect, it, vi } from "vitest";
import { downgradeToV1 } from "@/features/rx-order/domain/payload";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { buildOrder, derive } from "@/features/rx-order/form/model";
import { defaultValues, type RxCatalog, type RxFormValues } from "@/features/rx-order/form/types";
import { saveRxOrderMirror } from "@/tests/support/rxSubmissionFixture";
import { SAMPLE_OMA_1471 } from "@/features/rx-order/domain/standardShapes";
import { parseOma, shapeGeometry } from "@/features/rx-order/domain/shape";

const rows = vi.hoisted(() => ({ current: { quote_lines: [], rx_details: [], quote_frame_details: [], quotes: [] } as any }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: async (_name: string, args: any) => {
      const { saveRxOrderMirror: mirror } = await import("@/tests/support/rxSubmissionFixture");
      return { data: mirror(args.p_quote_id, args.p_payload, rows.current), error: null };
    },
  },
}));

import { persistPayload } from "@/features/rx-order/embed/rx-order-adapter";

const catalog: RxCatalog = {
  materials: [{ id: "plastic", n: "Plastic 1.50", up: 0 }],
  designs: [{ id: "sv", n: "Single Vision", v: "sv", base: 0 }],
  colours: [{ id: "clear", n: "Clear", up: 0 }],
  combos: [{ m: "plastic", d: "sv", c: "clear" }],
  treatments: [
    { id: "ar1", c: "Anti-reflective", n: "Super AR", d: "", p: 48, grp: "ar" },
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

const ctx = {
  lensIndex: new Map(),
  addons: [
    { id: "ar1", name: "Super AR", sku: "AR-1", price: 48, cost: 5, category: "ar_coating" },
    { id: "tint", name: "Solid Tint", sku: "TN-1", price: 22, cost: 3, category: "tint" },
  ] as any,
  lensPriceBBD: () => 100,
  resolveAlias: () => ({ alias: "A1", label: "lens" }),
};

const values = (): RxFormValues => {
  const v = defaultValues(776);
  v.patient = { first: "Ann", last: "Lee" };
  v.job.scope = "glaze";
  v.frame = { ...v.frame, name: "Ray", mount: "rimless", a: "52", b: "38", dbl: "18" };
  v.lens.od = { m: "plastic", d: "sv", c: "clear" };
  v.treatments = ["ar1", "tint"];
  v.tint.match = true;
  v.delivery.service = "pri";
  for (const e of ["od", "os"] as const) v.rx[e] = { ...v.rx[e], sph: "+7.00", cyl: "-0.75", axis: "90", pd: "32.0", prism: "2.00", base: "OUT" };
  v.rx.od.ht = "";
  return v;
};

describe("the form's order through the real save path", () => {
  it("saves every priced line, with surcharges citing their rules, and the totals agree", async () => {
    const v = values();
    const d = derive(v, catalog);
    expect(d.sections.rx).toBe(true);
    const order = buildOrder(v, d, catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    const quotedTotal = (order.quote as any).total as number;
    expect(quotedTotal).toBeGreaterThan(300); // lens + coatings + prism + high power + oversize + glazing + priority

    const saved = await persistPayload(null, downgradeToV1(order), ctx);
    const lines = rows.current.quote_lines as any[];
    const sum = lines.reduce((s, l) => s + l.qty * l.unit_sell_price_bbd, 0);
    expect(sum).toBeCloseTo(quotedTotal, 1);
    expect(saved.totalBBD).toBeCloseTo(quotedTotal, 1);

    const fees = lines.filter((l) => l.line_type === "Fee").map((l) => l.group_key).sort();
    expect(fees).toEqual(expect.arrayContaining([
      "surcharge:glazing_rimless", "surcharge:high_power", "surcharge:priority_service", "surcharge:prism",
    ]));
    // one lab item per coating, not one per eye; the tint carries its match surcharge in its own price
    expect(lines.filter((l) => l.line_type === "AddOn").map((l) => l.sku).sort()).toEqual(["AR-1", "TN-1"]);
    expect(lines.filter((l) => l.line_type === "Lens")).toHaveLength(2);
    // saved prescription and frame in their own columns
    expect(rows.current.rx_details[0]).toMatchObject({ od_sph: 7, os_sph: 7, od_prism_value: 2, od_prism_dir: "OUT" });
    expect(rows.current.quote_frame_details[0]).toMatchObject({ job_scope: "full_glaze", mount_type: "rimless" });
  });

  it("a remote-edge order with a trace saves as remote_edge with its trace geometry", async () => {
    const v = values();
    v.job.scope = "remote";
    v.frame.mount = "plastic";
    const data = parseOma(SAMPLE_OMA_1471)!;
    v.frame.a = data.hbox!.toFixed(2); v.frame.b = data.vbox!.toFixed(2);
    v.shape = { source: "trace", standardId: null, fileName: "1471.oma", fileSize: 8681, data, confirmed: true };
    v.treatments = [];
    v.rx.od.prism = ""; v.rx.os.prism = ""; v.rx.od.sph = "-2.00"; v.rx.os.sph = "-2.00";
    const d = derive(v, catalog);
    expect(d.sections.frame).toBe(true);
    const order = buildOrder(v, d, catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    await persistPayload(null, downgradeToV1(order), ctx);
    const frame = rows.current.quote_frame_details[0];
    const g = shapeGeometry(data, { a: Number(v.frame.a), b: Number(v.frame.b), dbl: 18 })!;
    expect(frame).toMatchObject({ job_scope: "remote_edge", is_uncut: false, shape_source_file: "1471.oma", mount_type: "plastic" });
    expect(frame.shape_traced_ed).toBeCloseTo(g.metrics.ed, 1);
    expect(frame.trace_geometry.radii.R).toHaveLength(data.points.R.length);
    // remote edge adds its charge (glazing + remote) as a surcharge line citing the rule
    expect((rows.current.quote_lines as any[]).some((l) => l.group_key === "surcharge:remote_edge")).toBe(true);
  });

  it("Chemistrie clips reach the lab as notes and never become a line or a charge", async () => {
    const v = values();
    v.job.scope = "uncut";
    v.treatments = [];
    v.delivery.service = "std";
    v.rx.od.prism = ""; v.rx.os.prism = ""; v.rx.od.sph = "-2.00"; v.rx.os.sph = "-2.00";
    v.delivery.notes = "Rush";
    const without = derive(v, catalog);
    v.chemClips = [
      { id: "a", type: "sun", colour: "Grey", mirror: "", gradient: "", polarised: true, add: "", magnet: "Silver", bridge: "Black", crystal: "none" },
      { id: "b", type: "readers", colour: "", mirror: "", gradient: "", polarised: false, add: "1.50", magnet: "Gold", bridge: "Black", crystal: "emerald" },
    ];
    const d = derive(v, catalog);
    expect(d.price.sub).toBe(without.price.sub);
    const order = buildOrder(v, d, catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    await persistPayload(null, downgradeToV1(order), ctx);
    const lines = rows.current.quote_lines as any[];
    expect(lines.some((l) => /chemistrie/i.test(l.item_name))).toBe(false);
    expect(lines.reduce((s, l) => s + l.qty * l.unit_sell_price_bbd, 0)).toBeCloseTo(without.price.sub, 1);
    // the specification is in the notes the lab receives
    const notes = rows.current.quotes[0].notes_customer as string;
    expect(notes).toContain("Rush");
    expect(notes).toContain("Chemistrie clip 1 — Chemistrie Sun · Solid polarised: Grey");
    expect(notes).toContain("Chemistrie clip 2 — Chemistrie Readers · Reader power: +1.50");
    expect(rows.current.quotes[0].rx_payload.chemistrie).toHaveLength(2);
  });

  it("the mirror of the database function would accept exactly this payload", () => {
    // saveRxOrderMirror throws on the same rules the SQL enforces (unknown line type, bad surcharge code)
    expect(() => saveRxOrderMirror(null, { lines: [{ line_type: "Fee", item_name: "x", qty: 1, unit_sell_price_bbd: 1, group_key: "surcharge:nope" }] }, { quote_lines: [], rx_details: [], quote_frame_details: [], quotes: [] })).toThrow(/surcharge/);
  });
});
