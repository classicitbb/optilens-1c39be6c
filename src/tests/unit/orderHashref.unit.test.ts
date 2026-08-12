import { describe, expect, it } from "vitest";
import {
  buildOrderHashref,
  canonicalOrderFromRxSubmission,
  canonicalOrderFromStockSubmission,
  inferItemSource,
  normalizeItemSource,
} from "../../../supabase/functions/_shared/orders/hashref";

// The one order format both transports and both order forms go through.
// Gatekeeper posts this text as rx_content; optilens-local receives the same
// canonical order on its claim response. If these two stop agreeing, the
// promise that a Gatekeeper release and an OptiLens release are the same
// order stops being true — so the shape is pinned here.

const ROUTING = { labNum: "5", custNum: "1095001" };

const fieldsOf = (hashref: string) => {
  const map = new Map<string, string>();
  for (const line of hashref.split("\r\n")) {
    const at = line.indexOf(":");
    if (at > 0) map.set(line.slice(0, at), line.slice(at + 1));
  }
  return map;
};

const rxSubmission = () => ({
  id: "3f0c2b1e-1111-4222-8333-444455556666",
  gatekeeper_order_id: 362558,
  payload: {
    quote: { quote_number: "Q-2041", customer_name: "Bob's Optical", contact_name: "LEOMC", notes_customer: "Rush job" },
    frame: { is_uncut: false, job_scope: "full_glaze", brand: "Ray-Ban", model_colour: "RB2140 Black", a_mm: 52, b_mm: 40, ed_mm: 55, dbl_mm: 20, bridge_mm: 18 },
    lenses: [{
      alias: "0000000100001",
      codes: {
        material_code: "20", material_description: "POLYCARBONATE",
        style_code: "100", style_description: "PROGRESSIVE",
        color_code: "1", color_description: "CLEAR",
      },
      rx: { od_sph: -2.5, od_cyl: -1, od_axis: 90, od_fpd: 31.5, os_sph: -2.25, os_cyl: -0.75, os_axis: 85, os_fpd: 31 },
    }],
    addons: [
      { item_name: "Anti-Reflective Coating", sku: "AR-100", qty: 1, line_type: "AddOn" },
      { item_name: "Grey Tint 50%", sku: "TINT-G50", qty: 1, line_type: "AddOn" },
    ],
  },
});

const stockSubmission = () => ({
  id: "aa0c2b1e-9999-4222-8333-444455556666",
  gatekeeper_order_id: 900001,
  payload: {
    po_number: "PO-77",
    order_reference: "Counter sale",
    instructions: "Hold for pickup",
    items: [
      { sku: "5110102893", source: "FLENS", description: "CV Stock 1.59 -2.00/-1.00", quantity: 2, comment: "shelf A", part_rx: "Y", unit_price: 18.5 },
      { sku: "0011751138", source: "SLENS", description: "CV Semi 1.60", quantity: 1, part_rx: "Y", unit_price: 22 },
    ],
  },
});

describe("item_source normalisation", () => {
  it("rewrites optilens-local's SLENS to the spec's SFLENS", () => {
    expect(normalizeItemSource("SLENS")).toBe("SFLENS");
    expect(normalizeItemSource("semi_finished")).toBe("SFLENS");
    expect(normalizeItemSource("FLENS")).toBe("FLENS");
  });

  it("keeps the spec's own casing for RXAdd and falls back to MISC", () => {
    expect(normalizeItemSource("rxadd")).toBe("RXAdd");
    expect(normalizeItemSource("something unknown")).toBe("MISC");
    expect(normalizeItemSource("")).toBe("MISC");
  });

  it("categorises Rx add-on lines by name", () => {
    expect(inferItemSource("Anti-Reflective Coating", "AddOn")).toBe("COAT");
    expect(inferItemSource("Grey Tint 50%", "AddOn")).toBe("TINT");
    expect(inferItemSource("Edging", "AddOn")).toBe("EDGING");
    expect(inferItemSource("Lens cloth", "Supply")).toBe("MISC");
  });
});

describe("hashref envelope", () => {
  it("opens with start_order, then file_version/agent_name/agent_version", () => {
    const hashref = buildOrderHashref(canonicalOrderFromRxSubmission(rxSubmission()), ROUTING);
    const lines = hashref.split("\r\n");
    expect(lines[0]).toBe("start_order");
    expect(lines[1]).toBe("file_version:2.5");
    expect(lines[2]).toBe("agent_name:optilens");
    expect(lines[3]).toBe("agent_version:1");
    expect(lines[lines.length - 1]).toBe("end_order");
  });

  it("routes both order kinds through the same contract fields", () => {
    for (const hashref of [
      buildOrderHashref(canonicalOrderFromRxSubmission(rxSubmission()), ROUTING),
      buildOrderHashref(canonicalOrderFromStockSubmission(stockSubmission()), ROUTING),
    ]) {
      const fields = fieldsOf(hashref);
      expect(fields.get("lab_num")).toBe("005");
      expect(fields.get("cust_num")).toBe("1095001");
    }
  });

  it("refuses to build without an allocated order number", () => {
    const submission = { ...rxSubmission(), gatekeeper_order_id: null };
    expect(() => canonicalOrderFromRxSubmission(submission)).toThrow(/order number/i);
  });
});

describe("prescription orders", () => {
  it("sends both eyes with lens codes, zeroed prism, and the edged frame box", () => {
    const fields = fieldsOf(buildOrderHashref(canonicalOrderFromRxSubmission(rxSubmission()), ROUTING));
    expect(fields.get("rx_eye")).toBe("3");
    expect(fields.get("rx_od_sphere")).toBe("-2.50");
    expect(fields.get("rx_os_cylinder")).toBe("-0.75");
    expect(fields.get("rx_od_axis")).toBe("90");
    expect(fields.get("rx_od_prism")).toBe("0.00");
    expect(fields.get("rx_os_prism2_dir")).toBe("UP");
    expect(fields.get("x_od_lens_alias")).toBe("0000000100001");
    expect(fields.get("frame_edge")).toBe("EDGED");
    expect(fields.get("frame_a")).toBe("52.00");
  });

  it("derives an uncut diameter instead of frame measurements for a surface-only job", () => {
    const submission = rxSubmission();
    submission.payload.frame = { ...submission.payload.frame, is_uncut: true, job_scope: "surface_only", ed_mm: 54.2 } as any;
    const fields = fieldsOf(buildOrderHashref(canonicalOrderFromRxSubmission(submission), ROUTING));
    expect(fields.get("frame_edge")).toBe("UNCUT");
    expect(fields.get("x_uncut_by_diam")).toBe("Y");
    expect(fields.get("x_od_uncut_diam")).toBe("55");
    expect(fields.has("frame_a")).toBe(false);
  });

  it("carries coatings and tints as order items so the lab gets the whole job", () => {
    const hashref = buildOrderHashref(canonicalOrderFromRxSubmission(rxSubmission()), ROUTING);
    expect(hashref).toContain("item_start\r\nsku:AR-100\r\nitem_source:COAT");
    expect(hashref).toContain("item_start\r\nsku:TINT-G50\r\nitem_source:TINT");
    expect(hashref.match(/item_end/g)).toHaveLength(2);
  });

  it("rejects a lens line with no confirmed alias rather than sending a blank one", () => {
    const submission = rxSubmission();
    submission.payload.lenses = [{ alias: null, codes: null, rx: {} }] as any;
    expect(() => canonicalOrderFromRxSubmission(submission)).toThrow(/alias/i);
  });
});

describe("stock orders", () => {
  it("uses rx_eye 5 and the no-frame descriptors", () => {
    const fields = fieldsOf(buildOrderHashref(canonicalOrderFromStockSubmission(stockSubmission()), ROUTING));
    expect(fields.get("rx_eye")).toBe("5");
    expect(fields.get("frame_status")).toBe("LENSES ONLY");
    expect(fields.get("frame_edge")).toBe("UNCUT");
    expect(fields.has("rx_od_sphere")).toBe(false);
  });

  it("writes each SKU as an item block with a padded quantity and its price", () => {
    const hashref = buildOrderHashref(canonicalOrderFromStockSubmission(stockSubmission()), ROUTING);
    expect(hashref).toContain("sku:5110102893");
    expect(hashref).toContain("item_quantity:02");
    expect(hashref).toContain("x_misc_item_price:18.50");
    expect(hashref).toContain("item_source:SFLENS");
    expect(hashref.match(/item_start/g)).toHaveLength(2);
  });

  it("falls back to the order reference for the mandatory patient name", () => {
    const fields = fieldsOf(buildOrderHashref(canonicalOrderFromStockSubmission(stockSubmission()), ROUTING));
    expect(fields.get("patient_name")).toBe("Counter sale");
    expect(fields.get("customer_po_num")).toBe("PO-77");
  });

  it("refuses an item with no SKU rather than sending an unorderable line", () => {
    const submission = stockSubmission();
    submission.payload.items = [{ sku: "", source: "FLENS", description: "Mystery", quantity: 1 }] as any;
    expect(() => buildOrderHashref(canonicalOrderFromStockSubmission(submission), ROUTING)).toThrow(/SKU/i);
  });
});

describe("field escaping", () => {
  it("never lets a colon inside a value break the identifier separator", () => {
    const submission = stockSubmission();
    submission.payload.instructions = "Call first: ask for Sam";
    const fields = fieldsOf(buildOrderHashref(canonicalOrderFromStockSubmission(submission), ROUTING));
    expect(fields.get("instructions")).toBe("Call first  ask for Sam");
  });
});
