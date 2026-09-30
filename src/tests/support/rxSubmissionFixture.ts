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
