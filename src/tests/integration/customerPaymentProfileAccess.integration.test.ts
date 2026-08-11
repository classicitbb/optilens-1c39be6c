import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("customer payment profile access", () => {
  const migration = read("supabase/migrations/20260811022224_ce355bb5-5077-4dc8-8e83-a17e074af686.sql");

  it("exposes payment settings through a security-definer RPC", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_customer_payment_profile(");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_customer_payment_profile(integer) TO authenticated");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_customer_payment_profile(integer) FROM PUBLIC, anon");
  });

  it("keeps the RPC scoped to the caller's own or linked accounts", () => {
    expect(migration).toContain("can_access_customer_portal_feature(v_uid, 'statements')");
    expect(migration).toContain("FROM public.portal_account_memberships m");
    expect(migration).toContain("m.status = 'active'");
    expect(migration).toContain("m.revoked_at IS NULL");
  });

  it("never returns cost or credit columns", () => {
    for (const forbidden of ["credit_limit", "cost", "base_price"]) {
      expect(migration.includes(forbidden)).toBe(false);
    }
  });

  it("has the statements screen read the RPC instead of the staff-only view", () => {
    const section = read("src/components/account/sections/StatementsSection.tsx");
    expect(section).toContain('"get_customer_payment_profile"');
    expect(section).not.toContain('.from("customer_payment_profile_public")');
  });
});
