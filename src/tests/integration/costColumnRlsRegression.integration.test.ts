import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const read = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), "utf8");

/**
 * Regression coverage for the security fix that removed anon/authenticated
 * SELECT access on the cost-bearing base tables (lenses/addons/supplies) and
 * routes public storefront reads through the *_public views.
 *
 * Because vitest runs offline (no live DB), we assert the invariants that
 * would otherwise leak cost columns:
 *  1. A migration exists that revokes anon/authenticated SELECT on the base
 *     tables AND grants SELECT on the *_public views.
 *  2. No migration re-adds a public/anon "select" RLS policy on the base
 *     tables, and no migration re-grants SELECT on them to anon/authenticated.
 *  3. The storefront data hook queries only the *_public views (or the
 *     get_*_safe RPCs) — never the raw cost-bearing tables.
 */
describe("cost column RLS regression", () => {
  const migrationsDir = resolve(repoRoot, "supabase/migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const migrations = migrationFiles.map((name) => ({
    name,
    sql: readFileSync(resolve(migrationsDir, name), "utf8"),
  }));

  it("has a migration that revokes anon/authenticated SELECT on base cost tables and grants views", () => {
    const revoker = migrations.find(({ sql }) => {
      const normalized = sql.replace(/\s+/g, " ");
      return (
        /REVOKE SELECT ON public\.lenses FROM anon, authenticated/i.test(normalized) &&
        /REVOKE SELECT ON public\.addons FROM anon, authenticated/i.test(normalized) &&
        /REVOKE SELECT ON public\.supplies FROM anon, authenticated/i.test(normalized) &&
        /GRANT SELECT ON public\.lenses_public TO anon, authenticated/i.test(normalized) &&
        /GRANT SELECT ON public\.addons_public TO anon, authenticated/i.test(normalized) &&
        /GRANT SELECT ON public\.supplies_public TO anon, authenticated/i.test(normalized)
      );
    });

    expect(revoker, "expected a migration that revokes SELECT on lenses/addons/supplies and grants the _public views").toBeDefined();
  });

  it("does not re-grant SELECT on cost-bearing base tables to anon or authenticated in a later migration", () => {
    const forbiddenGrantPatterns = [
      /GRANT\s+[^;]*\bSELECT\b[^;]*\bON\s+public\.lenses\b(?![a-z_])[^;]*TO[^;]*\b(anon|authenticated)\b/i,
      /GRANT\s+[^;]*\bSELECT\b[^;]*\bON\s+public\.addons\b(?![a-z_])[^;]*TO[^;]*\b(anon|authenticated)\b/i,
      /GRANT\s+[^;]*\bSELECT\b[^;]*\bON\s+public\.supplies\b(?![a-z_])[^;]*TO[^;]*\b(anon|authenticated)\b/i,
    ];

    // Only inspect migrations at or after the security fix so pre-fix history is ignored.
    const cutoff = "20260713122250";
    const laterMigrations = migrations.filter(({ name }) => name.slice(0, 14) >= cutoff);

    for (const { name, sql } of laterMigrations) {
      // Skip the fix migration itself: it contains REVOKE lines, no re-grants.
      const normalized = sql.replace(/\s+/g, " ");
      for (const pattern of forbiddenGrantPatterns) {
        expect(
          pattern.test(normalized),
          `migration ${name} must not GRANT SELECT on cost-bearing base tables to anon/authenticated`,
        ).toBe(false);
      }
    }
  });

  it("does not re-introduce a public/anon SELECT RLS policy on cost-bearing base tables", () => {
    const cutoff = "20260713122250";
    const laterMigrations = migrations.filter(({ name }) => name.slice(0, 14) >= cutoff);

    const forbiddenPolicyPatterns = [
      /CREATE\s+POLICY[^;]*ON\s+public\.lenses[^;]*FOR\s+SELECT[^;]*TO\s+(anon|public)/i,
      /CREATE\s+POLICY[^;]*ON\s+public\.addons[^;]*FOR\s+SELECT[^;]*TO\s+(anon|public)/i,
      /CREATE\s+POLICY[^;]*ON\s+public\.supplies[^;]*FOR\s+SELECT[^;]*TO\s+(anon|public)/i,
    ];

    for (const { name, sql } of laterMigrations) {
      const normalized = sql.replace(/\s+/g, " ");
      for (const pattern of forbiddenPolicyPatterns) {
        expect(
          pattern.test(normalized),
          `migration ${name} must not add a public/anon SELECT policy on cost-bearing base tables`,
        ).toBe(false);
      }
    }
  });

  it("storefront product hook queries only cost-safe public views", () => {
    const hook = read("src/hooks/useStoreProducts.ts");

    // Must reference the safe views.
    expect(hook).toMatch(/lenses_public/);
    expect(hook).toMatch(/addons_public/);
    expect(hook).toMatch(/supplies_public/);

    // Must NOT query the cost-bearing base tables directly.
    const forbidden = [
      /\.from\(\s*["']lenses["']\s*\)/,
      /\.from\(\s*["']addons["']\s*\)/,
      /\.from\(\s*["']supplies["']\s*\)/,
    ];
    for (const pattern of forbidden) {
      expect(pattern.test(hook), `useStoreProducts must not query base cost tables: ${pattern}`).toBe(false);
    }

    // Must NOT select cost-column names from any source.
    const costColumns = /\b(base_cost|cost_price|landed_cost|unit_cost|wholesale_cost|cost_usd|cost_bbd)\b/;
    expect(costColumns.test(hook), "useStoreProducts must not select cost columns").toBe(false);
  });
});
