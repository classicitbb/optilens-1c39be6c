import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

const read = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

describe("supabase crm rls hardening", () => {
  it("defines a staff-only helper that excludes customer portal roles", () => {
    const migration = read("supabase/migrations/20260521141500_harden_crm_rls_and_transactional_email.sql");

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.has_staff_role");
    expect(migration).toContain("role IN ('admin', 'operator', 'viewer')");
    expect(migration).not.toContain("'customer'");
  });

  it("removes permissive crm bootstrap policies and replaces them with staff-scoped reads", () => {
    const migration = read("supabase/migrations/20260521141500_harden_crm_rls_and_transactional_email.sql");

    for (const policyName of [
      "opportunities_select_auth",
      "opportunities_write_auth",
      "activities_select_auth",
      "activities_write_auth",
      "notes_select_auth",
      "notes_write_auth",
      "lead_audits_select_auth",
      "lead_audits_write_auth",
      "\"Role users can select contacts\"",
      "\"Role users can select opportunities\"",
      "\"Role users can select activities\"",
      "\"Authenticated users can view notes\"",
      "\"Authenticated users can view lead_audits\"",
    ]) {
      expect(migration).toContain(`DROP POLICY IF EXISTS ${policyName}`);
    }

    for (const policyName of [
      "Staff can view contacts",
      "Staff can view opportunities",
      "Staff can view activities",
      "Staff can view notes",
      "Staff can view lead_audits",
    ]) {
      expect(migration).toContain(`CREATE POLICY "${policyName}"`);
    }

    const staffChecks = migration.match(/USING \(public\.has_staff_role\(auth\.uid\(\)\)\);/g) ?? [];
    expect(staffChecks).toHaveLength(5);
  });
});

describe("supabase product cost rls hardening", () => {
  const migration = read("supabase/migrations/20260713150000_product_cost_rpc_access_and_audit.sql");

  it("restricts direct cost-bearing product table reads to editor roles", () => {
    const migration = read("supabase/migrations/20260624090000_harden_product_cost_rls_and_analytics_inserts.sql");

    for (const tableName of ["addons", "lenses", "supplies"]) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "Role users can select ${tableName}" ON public.${tableName};`);
      expect(migration).toContain(`CREATE POLICY "Editors can select ${tableName}"`);
      expect(migration).toContain(`ON public.${tableName}`);
    }

    const editRoleChecks = migration.match(/USING \(public\.has_edit_role\(auth\.uid\(\)\)\);/g) ?? [];
    expect(editRoleChecks).toHaveLength(3);
    expect(migration).not.toContain("USING (public.has_any_role(auth.uid()))");

    for (const viewName of ["addons_public", "lenses_public", "supplies_public"]) {
      expect(migration).toContain(`GRANT SELECT ON public.${viewName} TO anon, authenticated;`);
    }
  });

  it("keeps public analytics writes but rejects malformed payloads", () => {
    const migration = read("supabase/migrations/20260624090000_harden_product_cost_rls_and_analytics_inserts.sql");

    for (const policyName of [
      "website_analytics_sessions_insert_public",
      "website_analytics_pageviews_insert_public",
      "website_analytics_web_vitals_insert_public",
    ]) {
      expect(migration).toContain(`DROP POLICY IF EXISTS ${policyName}`);
      expect(migration).toContain(`CREATE POLICY ${policyName}`);
      expect(migration).toContain("TO anon, authenticated");
    }

    expect(migration).not.toContain("WITH CHECK (true)");
    expect(migration).toContain("visitor_id ~*");
    expect(migration).toContain("write_token IS NOT NULL");
    expect(migration).toContain("pathname LIKE '/%'");
    expect(migration).toContain("metric_name IN ('CLS', 'FCP', 'INP', 'LCP', 'TTFB')");
    expect(migration).toContain("metric_rating IN ('good', 'needs-improvement', 'poor', 'unknown')");
  });

  it("exposes storefront prices through safe RPCs while redacting costs for anon and regular authenticated users", () => {
    for (const [functionName, costColumn] of [
      ["get_lenses_safe", "l.base_price"],
      ["get_supplies_safe", "s.base_price"],
      ["get_addons_safe", "a.cost"],
    ]) {
      expect(migration).toContain(`CREATE OR REPLACE FUNCTION public.${functionName}()`);
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${functionName}() FROM PUBLIC;`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${functionName}() TO anon, authenticated;`);
      expect(migration).toContain("SECURITY DEFINER");
      expect(migration).toContain(`THEN ${costColumn} ELSE NULL::numeric END`);
    }

    expect(migration).toContain("l.is_active = true AND l.show_on_website = true");
    expect(migration).toContain("s.is_active = true AND s.show_on_website = true");
    expect(migration).toContain("a.is_active = true AND a.show_on_website = true");
  });

  it("provides a service-role database audit for direct grants and unsafe SELECT policies", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.audit_product_cost_rls()");
    expect(migration).toContain("has_table_privilege('anon'");
    expect(migration).toContain("has_table_privilege('authenticated'");
    expect(migration).toContain("pg_policy AS p");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.audit_product_cost_rls() TO service_role;");
  });
});
