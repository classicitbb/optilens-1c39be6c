import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("on-demand live-data gateway contract", () => {
  it("allows a missing customer only for the two staff-wide operations", () => {
    const migration = read("supabase/migrations/20261114100000_live_data_gateway_all_customers.sql");
    expect(migration).toContain("ALTER COLUMN website_customer_id DROP NOT NULL");
    expect(migration).toContain("CHECK ((website_customer_id IS NULL) = (operation IN ('innovations.all_orders', 'optilens.all_deliveries')))");
    expect(read("drizzle/migrations/0006_live_data_gateway_all_customers.sql")).toBe(migration);
  });

  it("keeps transient requests service-role only", () => {
    const migration = read("supabase/migrations/20260710170000_live_data_gateway.sql");
    expect(migration).toContain("REVOKE ALL ON public.live_data_gateway_requests FROM anon, authenticated, PUBLIC");
    expect(migration).toContain("GRANT ALL ON public.live_data_gateway_requests TO service_role");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("expires_at timestamptz NOT NULL");
  });

  it("derives customer identity server-side and exposes no arbitrary private route", () => {
    const gateway = read("supabase/functions/live-data-gateway/index.ts");
    expect(gateway).toContain('select("crm_customer_id,crm_contact_id,portal_access_status")');
    expect(gateway).toContain('select("id,account_number,innovations_customer_id,portal_orders_use_bill_to_account")');
    expect(gateway).toContain('"innovations.customer_account"');
    expect(gateway).toContain('"innovations.customer_statement"');
    expect(gateway).toContain('"optilens.customer_deliveries"');
    expect(gateway).not.toMatch(/body\.(url|path|sql|query)\b/);
  });

  it("uses live requests for statement and delivery display", () => {
    const statements = read("src/components/account/sections/StatementsSection.tsx");
    const orders = read("src/components/account/sections/MyOrdersSection.tsx");
    expect(statements).toContain('requestLiveData<LiveAccountResponse>("innovations.customer_account"');
    expect(statements).toContain('"innovations.customer_statement"');
    expect(orders).toMatch(/requestLiveData<LiveDeliveriesResponse>\(\s*"optilens\.customer_deliveries"/);
  });
});

