// Pins the Phase 0 contract of the Rx order data model (migrations
// 20261001130000–130600). These are source-level checks in the same style as
// the other migration tests: the SQL was also dry-run against the live schema
// inside a rolled-back transaction (2026-10-01).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = (name: string) => readFileSync(`supabase/migrations/${name}.sql`, "utf8");

describe("Rx order Phase 0 migrations", () => {
  it("saves atomically through one SECURITY DEFINER RPC that never trusts the client total", () => {
    const s = sql("20261001130600_save_rx_order");
    expect(s).toMatch(/FUNCTION public\.save_rx_order\(/);
    expect(s).toMatch(/SECURITY DEFINER/);
    // totals are summed from the rows just written
    expect(s).toMatch(/sum\(qty \* unit_sell_price_bbd\)/);
    expect(s).not.toMatch(/p_payload ->> 'total'/);
    // anon cannot call it; creating a quote is the RPC's job
    expect(s).toMatch(/REVOKE ALL ON FUNCTION public\.save_rx_order\(uuid, jsonb, boolean\) FROM PUBLIC, anon/);
    expect(s).toMatch(/nextval\('public\.rx_order_number_seq'\)/);
  });

  it("locks an order once it is released and keeps test saves staff-only", () => {
    const s = sql("20261001130600_save_rx_order");
    expect(s).toMatch(/s\.status IN \('approved', 'claimed', 'submitted'\)/);
    expect(s).toMatch(/Only staff can save test orders/);
    expect(s).toMatch(/can_access_customer_portal_feature\(v_uid, 'rx-order'\)/);
  });

  it("requires surcharge lines to cite a live rule", () => {
    const s = sql("20261001130600_save_rx_order");
    expect(s).toMatch(/'surcharge:' \|\| r\.code/);
  });

  it("seeds every surcharge the form engine used to hard-code", () => {
    const s = sql("20261001130300_rx_surcharge_rules");
    for (const code of [
      "prism", "oversize_blank", "high_power", "glazing_standard", "glazing_grooved",
      "glazing_rimless", "remote_edge", "tint_match", "priority_service", "single_eye",
    ]) expect(s).toContain(`('${code}'`);
  });

  it("gates customer Rx writes on rx-order, not the generic quotes feature", () => {
    const s = sql("20261001130500_rx_customer_write_gate");
    expect(s).toMatch(/WHEN p_quote_type = 'RX' THEN public\.can_access_customer_portal_feature\(p_user_id, 'rx-order'\)/);
    for (const table of ["quotes", "quote_lines", "rx_details", "quote_frame_details"]) {
      expect(s).toContain(`ON public.${table}`);
    }
    expect(s).toMatch(/can_write_customer_quote\(quote_type\)/);
  });

  it("keeps the event log staff-readable and write-protected", () => {
    const s = sql("20261001130400_rx_order_events");
    expect(s).toMatch(/has_any_role\(auth\.uid\(\)\)/);
    expect(s).not.toMatch(/CREATE POLICY[^;]*FOR (INSERT|UPDATE|DELETE|ALL)/);
    expect(s).toMatch(/AFTER INSERT OR UPDATE OF status ON public\.rx_order_submissions/);
  });

  it("keeps test-bench orders out of the outbox, the cart and every quote list", () => {
    const guard = sql("20261001140000_rx_test_quotes_stay_out_of_outbox");
    expect(guard).toMatch(/BEFORE INSERT ON public\.rx_order_submissions/);
    expect(guard).toMatch(/q\.is_test/);
    expect(guard).toMatch(/RETURN NULL/);

    // test mode in the embed returns BEFORE any cart / account / drafts write
    const embed = readFileSync("src/features/rx-order/RxOrderEmbed.tsx", "utf8");
    expect(embed).toMatch(/if \(isTest\) \{\s+onTestSubmitted\?\.\("Would be added to the cart"[\s\S]*?return;\s+\}\s+const added = await addToCart/);
    expect(embed).toMatch(/if \(isTest\) \{\s+onTestSubmitted\?\.\("Would be placed on the account/);
    expect(embed).toMatch(/await persist\(payload\);\s+if \(isTest\) return;/);

    for (const file of ["src/hooks/useQuotes.ts", "src/lib/mcp/tools/list-quotes.ts"]) {
      expect(readFileSync(file, "utf8")).toMatch(/\.eq\("is_test", false\)/);
    }
  });
});
