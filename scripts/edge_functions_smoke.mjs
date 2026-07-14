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

import { readFileSync } from "node:fs";
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
 * Every deployed edge function. Update this list when adding/removing
 * functions under supabase/functions/.
 */
const FUNCTIONS = [
  "admin-user-management",
  "api-v1",
  "auth-email-hook",
  "companion-assistant",
  "companion-web-search",
  "contact-inquiry",
  "crm-draft-outreach",
  "customer-onboarding",
  "docstudio-api",
  "handle-email-suppression",
  "handle-email-unsubscribe",
  "helpdesk-email",
  "helpdesk-followup",
  "helpdesk-inbound-email",
  "innovations-sync",
  "lead-intelligence",
  "lens-assistant",
  "live-data-gateway",
  "order-confirmation",
  "preview-transactional-email",
  "process-email-queue",
  "scotia-payment",
  "send-transactional-email",
  "vercel-analytics-proxy",
];

/**
 * Functions without an OPTIONS/CORS handler (webhooks, cron-only, JWT-gated
 * endpoints that reject preflight). For these we accept any non-5xx response
 * as "the function booted and is routing requests".
 */
const NO_CORS_FUNCTIONS = new Set([
  "handle-email-suppression",
  "helpdesk-followup",
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
        headers: { Origin: ORIGIN },
      }),
    TIMEOUT_MS,
    probe.name,
  );
  return probe.check(res);
}

async function main() {
  console.log(`Edge Functions smoke test → ${BASE}`);
  const failures = [];

  // Preflight checks (parallel, capped concurrency)
  const results = await Promise.all(
    FUNCTIONS.map(async (fn) => {
      try {
        const err = await checkPreflight(fn);
        return { fn, err };
      } catch (err) {
        return { fn, err: err.message || String(err) };
      }
    }),
  );

  for (const { fn, err } of results) {
    if (err) {
      console.log(`  ✗ ${fn}  ${err}`);
      failures.push(`${fn}: ${err}`);
    } else {
      console.log(`  ✓ ${fn}`);
    }
  }

  console.log("\nHealth probes:");
  for (const probe of HEALTH_PROBES) {
    try {
      const err = await runHealthProbe(probe);
      if (err) {
        console.log(`  ✗ ${probe.name}  ${err}`);
        failures.push(`${probe.name}: ${err}`);
      } else {
        console.log(`  ✓ ${probe.name}`);
      }
    } catch (err) {
      const msg = err.message || String(err);
      console.log(`  ✗ ${probe.name}  ${msg}`);
      failures.push(`${probe.name}: ${msg}`);
    }
  }

  if (failures.length) {
    console.error(`\n${failures.length} smoke check(s) failed:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\nAll ${FUNCTIONS.length} functions + ${HEALTH_PROBES.length} health probe(s) passed.`);
}

main().catch((err) => {
  console.error("Smoke run crashed:", err);
  process.exit(2);
});
