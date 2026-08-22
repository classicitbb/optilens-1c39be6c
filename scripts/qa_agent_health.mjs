#!/usr/bin/env node
/**
 * Agent-surface health smoke test.
 *
 * Verifies, without any credentials or writes:
 *   1. MCP endpoint answers the CORS preflight and does NOT 5xx on a
 *      JSON-RPC POST (a 401 is the healthy unauthenticated answer).
 *   2. Portal Copilot answers its CORS preflight.
 *   3. The scheduled platform-health-check function itself is reachable.
 *
 * Usage: npm run qa:agent-health
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
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* surfaced below */
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
const failures = [];

const preflight = (name) =>
  fetch(`${BASE}/${name}`, {
    method: "OPTIONS",
    headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization" },
  });

async function check(label, fn) {
  try {
    const message = await fn();
    if (message) {
      failures.push(`${label}: ${message}`);
      console.error(`FAIL  ${label} — ${message}`);
    } else {
      console.log(`ok    ${label}`);
    }
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    console.error(`FAIL  ${label} — ${error.message}`);
  }
}

await check("mcp preflight", async () => {
  const response = await preflight("mcp");
  await response.text().catch(() => "");
  return response.status >= 400 ? `status ${response.status}` : null;
});

await check("mcp JSON-RPC does not 5xx", async () => {
  const response = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
  const body = (await response.text().catch(() => "")).slice(0, 200);
  return response.status >= 500 ? `status ${response.status}: ${body}` : null;
});

await check("portal-copilot preflight", async () => {
  const response = await preflight("portal-copilot");
  await response.text().catch(() => "");
  return response.status >= 400 ? `status ${response.status}` : null;
});

await check("platform-health-check preflight", async () => {
  const response = await preflight("platform-health-check");
  await response.text().catch(() => "");
  return response.status >= 400 ? `status ${response.status}` : null;
});

if (failures.length > 0) {
  console.error(`\n${failures.length} agent health check(s) failed.`);
  process.exit(1);
}
console.log("\nAll agent health checks passed.");
