// Turns the rows persistPayload() writes into the payload build_rx_submission_payload()
// would snapshot into rx_order_submissions — the one hop of the outbound chain that
// lives in SQL and so cannot be imported into a unit test.
//
// This is a MIRROR of supabase/migrations/20260801131000_rx_order_submissions_outbox.sql
// (`build_rx_submission_payload`), kept deliberately literal: same joins, same
// "rx hangs off the lens line it was inserted against" behaviour. The rolled-back
// database check in docs/RX_HASHREF_FIDELITY.md pins it against the live function, so
// if this drifts the comparison there, not a passing unit test, is what fails.

export interface CapturedRows {
  quote_lines: any[];
  rx_details: any[];
  quote_frame_details: any[];
  quotes: any[];
}

export interface AliasCodes {
  material_code: string;
  material_description: string;
  style_code: string;
  style_description: string;
  color_code: string;
  color_description: string;
  mf_type: string;
}

export const buildSubmissionPayload = (
  rows: CapturedRows,
  opts: { quoteId: string; quoteNumber: string; accountId: number; codesFor: (alias: string) => AliasCodes | null },
) => {
  const quote = rows.quotes[0] ?? {};
  const frame = rows.quote_frame_details[0] ?? null;
  const lensLines = rows.quote_lines.filter((l) => l.line_type === "Lens");
  const addonLines = rows.quote_lines.filter((l) => ["AddOn", "Supply"].includes(l.line_type));
  const strip = ({ id, created_at, updated_at, ...rest }: any) => rest;

  return {
    quote: {
      id: opts.quoteId,
      quote_number: opts.quoteNumber,
      customer_name: quote.customer_name ?? null,
      contact_name: quote.contact_name ?? null,
      notes_customer: quote.notes_customer ?? null,
      grand_total: quote.grand_total ?? null,
      currency: "BBD",
    },
    account: { id: opts.accountId, name: "Retail", account_number: "RETAIL", innovations_customer_id: 3 },
    frame: frame ? strip(frame) : null,
    lenses: lensLines.map((l) => ({
      line_id: l.id,
      item_name: l.item_name,
      qty: l.qty,
      alias: l.innovations_alias ?? null,
      codes: l.innovations_alias ? opts.codesFor(l.innovations_alias) : null,
      // rx_details is keyed to ONE quote line — the first lens line — so the
      // second lens of a pair/split order carries rx: null, exactly as in SQL.
      rx: (() => {
        const r = rows.rx_details.find((x) => x.quote_line_id === l.id);
        return r ? strip(r) : null;
      })(),
    })),
    addons: addonLines.map((l) => ({ item_name: l.item_name, sku: l.sku, qty: l.qty, line_type: l.line_type })),
  };
};

// ── save_rx_order mirror ─────────────────────────────────────────────────────
// persistPayload() now saves through the save_rx_order RPC instead of writing
// tables one by one. This mirrors the RPC's row effects (migration
// 20261001130600) so the tests can still capture "the rows that would exist":
// lines replaced wholesale, rx_details hung off the FIRST lens line, one frame
// row, total summed from the lines. The same validation the SQL does is
// repeated here so a payload the database would refuse fails the test too.
const SURCHARGE_CODES = [
  "prism", "oversize_blank", "high_power", "glazing_standard", "glazing_grooved",
  "glazing_rimless", "remote_edge", "tint_match", "priority_service", "single_eye",
];

export const saveRxOrderMirror = (quoteId: string | null, payload: any, rows: CapturedRows) => {
  const id = quoteId ?? "quote-new";
  const lines: any[] = payload.lines ?? [];
  lines.forEach((l, i) => {
    if (!["Lens", "AddOn", "Supply", "Fee", "Discount", "Stock"].includes(l.line_type)) throw new Error(`line ${i + 1}: unknown line_type`);
    if (!(Number(l.qty) > 0)) throw new Error(`line ${i + 1}: qty must be positive`);
    if (l.line_type === "Fee" && !SURCHARGE_CODES.some((c) => l.group_key === `surcharge:${c}`)) {
      throw new Error(`line ${i + 1}: surcharge must cite an active rx_surcharge_rules code in group_key`);
    }
  });
  rows.quote_lines = lines.map((l, i) => ({ ...l, id: `line-${i + 1}`, quote_id: id, sort_order: l.sort_order ?? i }));
  const total = Math.round(rows.quote_lines.reduce((s, l) => s + l.qty * l.unit_sell_price_bbd, 0) * 100) / 100;
  const firstLens = rows.quote_lines.find((l) => l.line_type === "Lens");
  rows.rx_details = firstLens && payload.rx ? [{ ...payload.rx, quote_line_id: firstLens.id }] : [];
  rows.quote_frame_details = payload.frame ? [{ job_scope: "full_glaze", is_uncut: false, ...payload.frame, quote_id: id }] : [];
  rows.quotes = [{
    id,
    customer_name: payload.header?.customer_name ?? "",
    contact_name: payload.header?.contact_name ?? null,
    notes_customer: payload.header?.notes_customer ?? null,
    rx_payload: payload.order ?? {},
    subtotal_sell: total,
    grand_total: total,
  }];
  return { quote_id: id, quote_number: "Q-TEST", rx_order_number: 80000001, total, created: quoteId == null };
};
