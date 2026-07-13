#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const migrationsDir = resolve(repoRoot, "supabase/migrations");
const guardMigration = "20260713150000_product_cost_rpc_access_and_audit.sql";
const protectedTables = ["addons", "lenses", "supplies"];

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
  console.error("Product-cost RLS migration audit failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Product-cost RLS migration audit passed.");
await auditLiveDatabaseIfConfigured();

function auditMigration(file, sql) {
  for (const table of protectedTables) {
    const directGrant = new RegExp(
      `\\bGRANT\\s+SELECT\\s+ON\\s+public\\.${table}\\s+TO\\s+[^;]*(?:\\banon\\b|\\bauthenticated\\b)`,
      "i",
    );
    if (directGrant.test(sql)) {
      violations.push(`${file}: direct SELECT grant on public.${table} for anon/authenticated`);
    }
  }

  const policyPattern = /CREATE\s+POLICY\s+(?:"[^"]+"|\S+)\s+ON\s+public\.(addons|lenses|supplies)\s+FOR\s+(?:SELECT|ALL)\s+TO\s+([^\s]+(?:\s*,\s*[^\s]+)*)\s+USING\s*\(([\s\S]*?)\)\s*;/gi;
  for (const match of sql.matchAll(policyPattern)) {
    const [, table, roles, usingClause] = match;
    const normalizedRoles = roles.toLowerCase();
    const hasPublicRole = /\banon\b/.test(normalizedRoles) || /\bpublic\b/.test(normalizedRoles);
    const hasAuthenticatedWithoutEditorCheck = /\bauthenticated\b/.test(normalizedRoles)
      && !/has_edit_role\s*\(/i.test(usingClause);

    if (hasPublicRole || hasAuthenticatedWithoutEditorCheck) {
      violations.push(`${file}: unsafe SELECT policy on public.${table}`);
    }
  }
}

async function auditLiveDatabaseIfConfigured() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url && !serviceRoleKey) {
    console.log("Live database audit skipped (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable it).");
    return;
  }

  if (!url || !serviceRoleKey) {
    fail("Live database audit requires both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/audit_product_cost_rls`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    fail(`Live database audit RPC failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  if (!Array.isArray(payload)) {
    fail("Live database audit RPC returned an unexpected response.");
  }
  if (payload.length > 0) {
    fail(`Live database audit found policy violations: ${JSON.stringify(payload)}`);
  }

  console.log("Live product-cost RLS audit passed.");
}

function fail(message) {
  console.error(`Product-cost RLS audit failed: ${message}`);
  process.exit(1);
}
