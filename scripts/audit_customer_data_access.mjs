#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const guardMigration = "20260721235144_harden_customer_internal_data_access.sql";
const protectedTables = new Set([
  "catalog_assignments",
  "catalog_sections",
  "catalog_templates",
  "crm_pipelines",
  "cadences",
  "cadence_steps",
  "cadence_enrollments",
  "contact_tags",
  "contact_tag_links",
  "industries",
  "order_activity",
  "outreach_outbox",
  "help_article_contexts",
  "pricelist_versions",
  "pricelist_catalog_rows",
  "pricelist_overrides",
  "pricelist_line_overrides",
  "pricelist_child_sections",
  "pricelist_notes",
  "matrix_allocations",
  "price_matrix",
  "legacy_rates",
  "material_upgrades",
  "rx_price_categories",
  "rx_price_category_versions",
  "rx_price_groupings",
  "rx_price_grouping_versions",
  "addon_pricing_sheets",
  "pricing_sheets",
]);

const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const guardIndex = migrations.indexOf(guardMigration);

if (guardIndex === -1) {
  fail(`Missing required guard migration: supabase/migrations/${guardMigration}`);
}

const violations = [];
for (const file of migrations.slice(guardIndex + 1)) {
  auditMigration(file, readFileSync(resolve(migrationsDir, file), "utf8"));
}

if (violations.length > 0) {
  console.error("Customer internal-data access audit failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Customer internal-data access audit passed.");

function auditMigration(file, sql) {
  for (const statement of sql.split(";")) {
    const normalized = statement.replace(/\s+/g, " ");
    const tableMatch = normalized.match(
      /CREATE\s+POLICY\b[\s\S]*?\bON\s+\"?public\"?\.\"?([a-z_]+)\"?/i,
    );

    if (
      tableMatch
      && protectedTables.has(tableMatch[1].toLowerCase())
      && /\bhas_any_role\s*\(/i.test(normalized)
    ) {
      violations.push(`${file}: has_any_role SELECT/ALL policy on protected table public.${tableMatch[1]}`);
    }

    const createsView = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+\"?public\"?\./i.test(normalized);
    if (createsView && !/security_invoker\s*=\s*true/i.test(normalized)) {
      violations.push(`${file}: public view created without security_invoker = true`);
    }
  }
}

function fail(message) {
  console.error(`Customer internal-data access audit failed: ${message}`);
  process.exit(1);
}
