// What the React form sends to the lab, and what it prints, for ONE order.
//
// The chain under test, end to end, with every link real except the one that
// needs a database:
//
//   form values ─▶ derive() ─▶ buildOrder() ─▶ downgradeToV1() ─▶ persistPayload()
//     ─▶ [rows] ─▶ SQL payload builder ─▶ canonicalOrderFromRxSubmission()
//     ─▶ buildOrderHashref()                  … and PrintSheet() for the same values
//
// Why this exists alongside the two tests either side of it:
//
//   · rxOrderHashrefFidelity carries an order all the way to the Hashref file,
//     but it drives the LEGACY embed engine (embed/rx-order-engine.js), which
//     today only serves /admin/orders/rx-legacy/*.
//   · rxFormPersist drives the React form (form/model) but stops at the saved
//     rows — it never looks at what the lab receives.
//
// Both live Rx paths — /admin/orders/rx/new and the portal form — render
// form/RxForm. So the halves were each covered and the join was not: a field the
// React form serialises differently from the legacy engine could reach the lab
// wrong with every other test still green. This closes that join, and checks the
// printed sheet and the lab file describe the same order.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { downgradeToV1 } from "@/features/rx-order/domain/payload";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { buildOrder, derive } from "@/features/rx-order/form/model";
import { PrintSheet } from "@/features/rx-order/form/PrintSheet";
import { defaultValues, type RxCatalog, type RxFormValues } from "@/features/rx-order/form/types";
import { buildSubmissionPayload } from "@/tests/support/rxSubmissionFixture";
import {
  buildOrderHashref,
  canonicalOrderFromRxSubmission,
} from "../../../supabase/functions/_shared/orders/hashref";

const rows = vi.hoisted(() => ({ current: { quote_lines: [], rx_details: [], quote_frame_details: [], quotes: [] } as any }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: async (_name: string, args: any) => {
      const { saveRxOrderMirror } = await import("@/tests/support/rxSubmissionFixture");
      return { data: saveRxOrderMirror(args.p_quote_id, args.p_payload, rows.current), error: null };
    },
  },
}));

import { persistPayload } from "@/features/rx-order/embed/rx-order-adapter";

const catalog: RxCatalog = {
  materials: [{ id: "poly", n: "Polycarbonate", up: 0 }],
  designs: [{ id: "sv", n: "Single Vision", v: "sv", base: 0 }],
  colours: [{ id: "clear", n: "Clear", up: 0 }],
  combos: [{ m: "poly", d: "sv", c: "clear" }],
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
  resolveAlias: () => ({ alias: "ALIAS|poly|sv|clear", label: "Polycarbonate Single Vision Clear" }),
};

const CODES = {
  material_code: "20", material_description: "POLYCARBONATE",
  style_code: "100", style_description: "SINGLE VISION",
  color_code: "1", color_description: "CLEAR", mf_type: "SV",
};

/** A glazed job with prescribed prism and two coatings — the fields most likely
 *  to be lost between the form and the file. */
const glazedOrder = (): RxFormValues => {
  const v = defaultValues(776);
  v.patient = { first: "Ann", last: "Lee" };
  v.reference = "PO-7";
  v.job.scope = "glaze";
  v.frame = { ...v.frame, name: "Ray", mount: "plastic", a: "52", b: "38", dbl: "18" };
  v.lens.od = { m: "poly", d: "sv", c: "clear" };
  v.treatments = ["ar1", "tint"];
  v.rx.od = { ...v.rx.od, sph: "-2.00", cyl: "-0.75", axis: "90", pd: "32.0", prism: "2.00", base: "OUT" };
  v.rx.os = { ...v.rx.os, sph: "-2.25", cyl: "-0.50", axis: "85", pd: "31.5", prism: "", base: "" };
  return v;
};

/** Drive the whole chain and hand back the parsed file plus the rows behind it. */
const sendToLab = async (v: RxFormValues) => {
  rows.current = { quote_lines: [], rx_details: [], quote_frame_details: [], quotes: [] };
  const derived = derive(v, catalog);
  const order = buildOrder(v, derived, catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
  await persistPayload(null, downgradeToV1(order), ctx);
  const submission = buildSubmissionPayload(rows.current, {
    quoteId: "quote-1", quoteNumber: "Q-1001", accountId: 776, codesFor: () => CODES,
  });
  const canonical = canonicalOrderFromRxSubmission({
    id: "sub-1", gatekeeper_order_id: 100001, payload: submission as any,
  });
  const file = buildOrderHashref(canonical, { labNum: "001", custNum: "CV" });

  const fields = new Map<string, string>();
  const items: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  for (const raw of file.split("\r\n")) {
    if (raw === "item_start") { current = {}; continue; }
    if (raw === "item_end") { if (current) items.push(current); current = null; continue; }
    const at = raw.indexOf(":");
    if (at < 0) continue;
    const key = raw.slice(0, at);
    const value = raw.slice(at + 1);
    if (current) current[key] = value; else fields.set(key, value);
  }
  return { file, fields, items, derived, saved: rows.current };
};

describe("the React form's order, as the lab receives it", () => {
  it("carries every prescription value the dispenser typed into the Hashref file", async () => {
    const { fields } = await sendToLab(glazedOrder());

    expect(fields.get("rx_eye")).toBe("3");
    expect(fields.get("rx_od_sphere")).toBe("-2.00");
    expect(fields.get("rx_od_cylinder")).toBe("-0.75");
    expect(fields.get("rx_od_axis")).toBe("90");
    expect(fields.get("rx_od_far")).toBe("32.00");
    expect(fields.get("rx_os_sphere")).toBe("-2.25");
    expect(fields.get("rx_os_cylinder")).toBe("-0.50");
    expect(fields.get("rx_os_axis")).toBe("85");
    expect(fields.get("rx_os_far")).toBe("31.50");
    // the patient has to be identifiable on the lab's bench
    expect(String(fields.get("patient_name")).toUpperCase()).toContain("LEE");
  });

  it("sends prescribed prism with its base, and an explicit zero on the eye without it", async () => {
    const { fields } = await sendToLab(glazedOrder());
    // OD was prescribed 2.00 OUT. Silently zeroing this is the defect that
    // matters most here: the lab would grind a flat lens and nobody would know.
    expect(fields.get("rx_od_prism")).toBe("2.00");
    expect(fields.get("rx_od_prism_dir")).toBe("OUT");
    // OS had none. The spec wants an explicit zero with a direction, not an
    // absent field.
    expect(fields.get("rx_os_prism")).toBe("0.00");
    expect(fields.get("rx_os_prism_dir")).toBe("IN");
  });

  it("describes a glazed job with its real frame box, and an uncut job by diameter instead", async () => {
    const glazed = await sendToLab(glazedOrder());
    expect(glazed.fields.get("frame_edge")).toBe("EDGED");
    expect(glazed.fields.get("frame_a")).toBe("52.00");
    expect(glazed.fields.get("frame_b")).toBe("38.00");
    expect(glazed.fields.get("frame_dbl")).toBe("18.00");
    expect(glazed.fields.has("x_uncut_by_diam")).toBe(false);

    const uncutValues = glazedOrder();
    uncutValues.job.scope = "uncut";
    uncutValues.lens.diameter = "70";
    const uncut = await sendToLab(uncutValues);
    expect(uncut.fields.get("frame_edge")).toBe("UNCUT");
    expect(uncut.fields.get("frame_status")).toBe("UNCUT");
    expect(uncut.fields.get("frame_source")).toBe("NO TRACE - UNCUT");
    expect(uncut.fields.get("frame_model")?.length).toBeGreaterThan(0);
  });

  it("names the confirmed lens on both eyes so the lab does not have to map it", async () => {
    const { fields } = await sendToLab(glazedOrder());
    for (const side of ["od", "os"]) {
      expect(fields.get(`x_${side}_lens_alias`)).toBe("ALIAS|poly|sv|clear");
      expect(fields.get(`x_lens_${side}_material_code`)).toBe("20");
      expect(fields.get(`x_lens_${side}_style_code`)).toBe("100");
      expect(fields.get(`x_lens_${side}_color_code`)).toBe("1");
    }
  });

  it("sends each coating as one lab item, and never sends a surcharge as one", async () => {
    const { items, saved } = await sendToLab(glazedOrder());
    const skus = items.map((item) => item.sku).sort();
    expect(skus).toEqual(["AR-1", "TN-1"]);
    expect(items.find((item) => item.sku === "AR-1")?.item_source).toBe("COAT");
    expect(items.find((item) => item.sku === "TN-1")?.item_source).toBe("TINT");
    for (const item of items) expect(item.item_quantity).toMatch(/^\d{2}$/);

    // Surcharges are money, not things to make. They were saved as Fee lines and
    // must not reach the lab as items to be manufactured.
    const fees = (saved.quote_lines as any[]).filter((line) => line.line_type === "Fee");
    expect(fees.length).toBeGreaterThan(0);
    for (const fee of fees) expect(skus).not.toContain(fee.sku);
  });

  it("prints a sheet that agrees with the file the lab was sent", async () => {
    const values = glazedOrder();
    const { fields, derived } = await sendToLab(values);
    const html = renderToStaticMarkup(
      <PrintSheet values={values} derived={derived} catalog={catalog} orderNo={100001} accountName="Retail" />,
    );
    // PrintSheet renders a typographic minus; the Hashref uses ASCII. Normalise
    // so the comparison is about the NUMBER, not the glyph.
    const printed = html.replace(/−/g, "-");

    for (const key of ["rx_od_sphere", "rx_od_cylinder", "rx_os_sphere", "rx_os_cylinder"]) {
      expect(printed).toContain(String(fields.get(key)));
    }
    expect(printed).toContain("Lee");
    expect(printed).toContain("Super AR");
    expect(printed).toContain("No. 100001");
  });
});
