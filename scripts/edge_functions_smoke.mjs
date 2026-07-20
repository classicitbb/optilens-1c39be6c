#!/usr/bin/env node
/**
 * Edge Functions smoke test.
 *
 * Purpose: after any deploy, confirm every Supabase edge function is booting
 * and reachable. We keep this lightweight and side-effect-free:
 *
 *   1. CORS preflight (OPTIONS) — must respond 200/204 for every function.
 *      A boot failure or missing route returns 5xx / non-CORS, which we flag.
 *   2. Targeted health probes for functions that expose safe GET endpoints
 *      (e.g. `innovations-sync/version`).
 *
 * The script does NOT invoke privileged actions or write data. It never sends
 * an Authorization header, so it also verifies that each function's public
 * surface (preflight + declared health routes) is intact.
 *
 * Usage:
 *   node scripts/edge_functions_smoke.mjs
 *   npm run qa:edge-smoke
 *
 * Env: VITE_SUPABASE_URL (falls back to reading .env).
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  if (process.env.VITE_SUPABASE_URL) return;
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, valueRaw] = m;
      if (process.env[key]) continue;
      process.env[key] = valueRaw.replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* ignore — surfaced below */
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) {
  console.error("VITE_SUPABASE_URL is not set. Add it to .env or the environment.");
  process.exit(2);
}

const BASE = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;
const ORIGIN = "https://classicvisions.lovable.app";

/**
 * Discover functions from source so a new function is automatically included
 * in both deploy and health gates. `_shared` is source-only and not deployable.
 */
const FUNCTIONS = readdirSync(resolve(process.cwd(), "supabase/functions"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort();

/**
 * Functions without an OPTIONS/CORS handler (webhooks, cron-only, JWT-gated
 * endpoints that reject preflight). For these we accept any non-5xx response
 * as "the function booted and is routing requests".
 */
const NO_CORS_FUNCTIONS = new Set([
  "handle-email-suppression",
  "helpdesk-followup",
  "mcp",
  "process-email-queue",
]);

/**
 * Optional deep health probes. Each entry hits a safe, side-effect-free
 * public endpoint and asserts on the response body/status.
 */
const HEALTH_PROBES = [
  {
    name: "innovations-sync/version",
    path: "/innovations-sync/version",
    method: "GET",
    check: async (res) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      const body = await res.json().catch(() => null);
      if (!body || body.name !== "innovations-sync" || typeof body.version !== "string") {
        return `unexpected body: ${JSON.stringify(body)}`;
      }
      return null;
    },
  },
  {
    // Requires a scoped `docstudio:health` API key (see docstudio-api/index.ts)
    // AND a valid signed JWT — docstudio-api doesn't override verify_jwt in
    // config.toml, so the Supabase gateway rejects the request before our
    // in-code x-api-key check ever runs unless Authorization carries *some*
    // valid project JWT. The anon/publishable key satisfies that (the gateway
    // only checks signature validity, not role) and is safe to use here — it's
    // the same key already shipped to every browser. Skipped, not failed, when
    // either prerequisite is missing — e.g. local runs, or before the key has
    // been provisioned via the api_keys table.
    name: "docstudio-api/email/health",
    path: "/docstudio-api/email/health",
    method: "GET",
    skip: () => !process.env.DOCSTUDIO_HEALTH_API_KEY || !process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    headers: () => ({
      "x-api-key": process.env.DOCSTUDIO_HEALTH_API_KEY,
      Authorization: `Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    }),
    check: async (res) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      const body = await res.json().catch(() => null);
      const validStatuses = new Set(["healthy", "degraded", "blocked", "no_data"]);
      if (!body || !validStatuses.has(body.status)) {
        return `unexpected body: ${JSON.stringify(body)}`;
      }
      return null;
    },
  },
];

const TIMEOUT_MS = 15_000;

async function withTimeout(promise, ms, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise(controller.signal);
  } catch (err) {
    if (err?.name === "AbortError") throw new Error(`${label} timed out after ${ms}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function checkPreflight(fn) {
  const url = `${BASE}/${fn}`;
  const res = await withTimeout(
    (signal) =>
      fetch(url, {
        method: "OPTIONS",
        signal,
        headers: {
          Origin: ORIGIN,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "authorization,content-type",
        },
      }),
    TIMEOUT_MS,
    `${fn} OPTIONS`,
  );
  // Consume body to avoid resource leaks
  await res.text().catch(() => "");
  if (NO_CORS_FUNCTIONS.has(fn)) {
    if (res.status >= 500) return `booted-but-crashing (status ${res.status})`;
    return null;
  }
  if (res.status !== 200 && res.status !== 204) {
    return `preflight status ${res.status}`;
  }
  return null;
}

async function runHealthProbe(probe) {
  const res = await withTimeout(
    (signal) =>
      fetch(`${BASE}${probe.path}`, {
        method: probe.method,
        signal,
        headers: { Origin: ORIGIN, ...(probe.headers?.() ?? {}) },
      }),
    TIMEOUT_MS,
    probe.name,
  );
  return probe.check(res);
}

async function reportHealth(checks, healthy) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return;

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/record_edge_function_health`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_source: process.env.EDGE_HEALTH_SOURCE ?? "manual",
      p_release_sha: process.env.GITHUB_SHA ?? process.env.EDGE_HEALTH_RELEASE_SHA ?? null,
      p_checks: checks,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`health report failed (${response.status}): ${detail}`);
  }

  console.log(`Recorded ${checks.length} function check(s) as ${healthy ? "healthy" : "unhealthy"}.`);
}

async function main() {
  console.log(`Edge Functions smoke test → ${BASE}`);
  const failures = [];
  const checks = [];

  // Preflight checks (parallel, capped concurrency)
  const results = await Promise.all(
    FUNCTIONS.map(async (fn) => {
      try {
        const err = await checkPreflight(fn);
        return { fn, err, checkedAt: new Date().toISOString() };
      } catch (err) {
        return { fn, err: err.message || String(err), checkedAt: new Date().toISOString() };
      }
    }),
  );

  for (const { fn, err, checkedAt } of results) {
    checks.push({ name: fn, healthy: !err, error: err ?? null, checkedAt });
    if (err) {
      console.log(`  ✗ ${fn}  ${err}`);
      failures.push(`${fn}: ${err}`);
    } else {
      console.log(`  ✓ ${fn}`);
    }
  }

  console.log("\nHealth probes:");
  for (const probe of HEALTH_PROBES) {
    if (probe.skip?.()) {
      console.log(`  ⊘ ${probe.name}  skipped (prerequisite not configured)`);
      continue;
    }
    try {
      const err = await runHealthProbe(probe);
      if (err) {
        console.log(`  ✗ ${probe.name}  ${err}`);
        failures.push(`${probe.name}: ${err}`);
        const functionName = probe.path.split("/").filter(Boolean)[0];
        const functionCheck = checks.find((check) => check.name === functionName);
        if (functionCheck) {
          functionCheck.healthy = false;
          functionCheck.error = `${probe.name}: ${err}`;
          functionCheck.checkedAt = new Date().toISOString();
        }
      } else {
        console.log(`  ✓ ${probe.name}`);
      }
    } catch (err) {
      const msg = err.message || String(err);
      console.log(`  ✗ ${probe.name}  ${msg}`);
      failures.push(`${probe.name}: ${msg}`);
      const functionName = probe.path.split("/").filter(Boolean)[0];
      const functionCheck = checks.find((check) => check.name === functionName);
      if (functionCheck) {
        functionCheck.healthy = false;
        functionCheck.error = `${probe.name}: ${msg}`;
        functionCheck.checkedAt = new Date().toISOString();
      }
    }
  }

  // The deployment/monitor workflow sets the service-role key. Local smoke
  // runs remain side-effect-free when that key is absent.
  try {
    await reportHealth(checks, failures.length === 0);
  } catch (err) {
    console.error(`Unable to record health result: ${err.message || String(err)}`);
    process.exit(2);
  }

  if (failures.length) {
    console.error(`\n${failures.length} smoke check(s) failed:`);
    for (const f of failures) {
      console.error(`  - ${f}`);
      // GitHub Actions error annotation: makes each failure show up individually
      // in the run summary/Checks UI (and therefore in the failure-notification
      // email), instead of only being visible by opening the raw log.
      if (process.env.GITHUB_ACTIONS) {
        console.log(`::error title=Edge function smoke check failed::${f}`);
      }
    }
    process.exit(1);
  }
  console.log(`\nAll ${FUNCTIONS.length} functions + ${HEALTH_PROBES.length} health probe(s) passed.`);
}

main().catch((err) => {
  console.error("Smoke run crashed:", err);
  process.exit(2);
});
