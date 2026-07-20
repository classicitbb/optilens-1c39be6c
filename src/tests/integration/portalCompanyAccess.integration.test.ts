import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const read = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("portal company access and statement billing gate", () => {
  const migration = read("supabase/migrations/20260716133000_portal_company_access_statement_tags.sql");
  const accessTagsMigration = read("supabase/migrations/20260720195353_portal_contact_access_tags.sql");

  it("adds explicit staff approval override fields without faking profile completion", () => {
    expect(migration).toContain("portal_access_approved_override boolean NOT NULL DEFAULT false");
    expect(migration).toContain("portal_access_approved_by uuid REFERENCES auth.users");
    expect(migration).toContain("portal_access_approved_at timestamptz");
    expect(migration).toContain("portal_access_approved_note text");
    expect(migration).toContain("v_manual_approved := COALESCE(v_profile.portal_access_approved_override, false)");
    expect(migration).toContain("v_email_verified AND (v_profile_completed OR v_manual_approved)");
  });

  it("gates pricing and statement access by explicit person contact tags", () => {
    expect(accessTagsMigration).toContain("CREATE OR REPLACE FUNCTION public.can_access_customer_pricing");
    expect(accessTagsMigration).toContain("CREATE OR REPLACE FUNCTION public.can_access_customer_statement");
    expect(accessTagsMigration).toContain("SELECT 'Approved Access to Pricing'");
    expect(accessTagsMigration).toContain("SELECT 'Approved Access to Statement'");
    expect(accessTagsMigration).toContain("IN ('approved access to pricing', 'ceo')");
    expect(accessTagsMigration).toContain("IN ('approved access to statement', 'approved access to statements', 'ceo')");
    expect(accessTagsMigration).toContain("link.contact_id = v_profile.crm_contact_id");
    expect(accessTagsMigration).toContain("GRANT EXECUTE ON FUNCTION public.can_access_customer_pricing(uuid) TO authenticated, service_role");
    expect(accessTagsMigration).toContain("GRANT EXECUTE ON FUNCTION public.can_access_customer_statement(uuid) TO authenticated, service_role");
  });

  it("keeps statements financially gated in the shared feature helper", () => {
    expect(accessTagsMigration).toContain("IF p_feature_key = 'statements' THEN");
    expect(accessTagsMigration).toContain("RETURN public.can_access_customer_statement(p_user_id)");
    expect(accessTagsMigration).toContain("IF p_feature_key = 'pricelists' THEN");
    expect(accessTagsMigration).toContain("RETURN public.can_access_customer_pricing(p_user_id)");
  });

  it("keeps assigned pricelist RPCs gated server-side", () => {
    expect(accessTagsMigration).toContain("CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_matrix");
    expect(accessTagsMigration).toContain("CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_addons");
    expect(accessTagsMigration).toContain("CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_catalog");
    expect(accessTagsMigration.match(/IF NOT public\.can_access_customer_pricing\(auth\.uid\(\)\) THEN/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("enforces the same statement gate in live-data-gateway and uses current staff roles", () => {
    const source = read("supabase/functions/live-data-gateway/index.ts");

    expect(source).toContain('["admin", "operator"].includes(row.role)');
    expect(source).not.toContain('["admin", "editor", "author"].includes(row.role)');
    expect(source).toContain('config.feature === "statements"');
    expect(source).toContain('rpc("can_access_customer_statement"');
    expect(source).toContain("Statements are available only to contacts tagged Approved Access to Statement or CEO.");
  });
});
