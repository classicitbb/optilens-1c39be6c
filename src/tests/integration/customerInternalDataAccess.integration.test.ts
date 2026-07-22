import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const migration = readFileSync(
  resolve(repoRoot, "supabase/migrations/20260721235144_harden_customer_internal_data_access.sql"),
  "utf8",
);

describe("customer access to internal CRM and pricing data", () => {
  it("replaces broad role reads with staff-only reads and preserves scoped portal bridges", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.has_staff_role");
    expect(migration).toContain("role IN ('admin'::public.app_role, 'operator'::public.app_role, 'viewer'::public.app_role)");
    expect(migration).toContain("AND qual ILIKE '%has_any_role%'");
    expect(migration).toContain("'catalog_assignments'");
    expect(migration).toContain("'crm_pipelines'");
    expect(migration).toContain("'pricelist_versions'");
    expect(migration).toContain("'pricing_sheets'");
    expect(migration).toContain("Staff can select internal");
    expect(migration).not.toContain("customer_pricing_access");
  });

  it("makes every public view security-invoker to prevent creator-privilege reads", () => {
    expect(migration).toContain("ALTER VIEW public.%I SET (security_invoker = true)");
    expect(migration).toContain("AND c.relkind = 'v'");
  });

  it("fails CI if a later migration restores a broad customer read or definer view", () => {
    const output = execFileSync(process.execPath, ["scripts/audit_customer_data_access.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(output).toContain("Customer internal-data access audit passed.");
  });
});
