// What the React form hands to the REAL save path (persistPayload →
// save_rx_order): every priced line of the form's quote must become a saved line,
// surcharges citing their rule, so the saved total equals the quoted total.
import { describe, expect, it, vi } from "vitest";
import { downgradeToV1 } from "@/features/rx-order/domain/payload";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { buildOrder, derive } from "@/features/rx-order/form/model";
import { defaultValues, type RxCatalog, type RxFormValues } from "@/features/rx-order/form/types";
import { saveRxOrderMirror } from "@/tests/support/rxSubmissionFixture";

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

  it("the mirror of the database function would accept exactly this payload", () => {
    // saveRxOrderMirror throws on the same rules the SQL enforces (unknown line type, bad surcharge code)
    expect(() => saveRxOrderMirror(null, { lines: [{ line_type: "Fee", item_name: "x", qty: 1, unit_sell_price_bbd: 1, group_key: "surcharge:nope" }] }, { quote_lines: [], rx_details: [], quote_frame_details: [], quotes: [] })).toThrow(/surcharge/);
  });
});
