#!/usr/bin/env node
/**
 * Email pipeline smoke test.
 *
 * Unlike edge_functions_smoke.mjs (boot/reachability only), this actually
 * exercises the send paths and confirms the expected side effects landed:
 *
 *   1. contact-inquiry: submits a real inquiry, confirms a public_inquiries
 *      row, a helpdesk ticket, and both email_send_log rows (admin
 *      notification + customer confirmation) landed.
 *   2. customer-onboarding: calls its smoke-test mode (a `customer-onboarding:
 *      smoke`-scoped x-api-key, see customer-onboarding/index.ts) to confirm
 *      the welcome-pricelist email enqueues — skipped gracefully if
 *      CUSTOMER_ONBOARDING_SMOKE_API_KEY isn't set.
 *
 * Test recipients are tagged (`smoke-test+...-<timestamp>@...`) and unique
 * per run, so they never collide with per-email rate limits and are easy to
 * find/clean up later. This writes real rows to the production database by
 * design — see the "Smoke test scope" decision recorded for this workflow.
 *
 * Usage:
 *   node scripts/email_pipeline_smoke.mjs
 *   npm run qa:email-pipeline-smoke
 *
 * Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (falls back to .env).
 * Optional: CUSTOMER_ONBOARDING_SMOKE_API_KEY, VITE_SUPABASE_PUBLISHABLE_KEY
 * (both required together to run the customer-onboarding check).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) {
  console.error("VITE_SUPABASE_URL is not set. Add it to .env or the environment.");
  process.exit(2);
}
if (!SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not set — required to verify DB side effects.");
  process.exit(2);
}

const FUNCTIONS_BASE = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;
const REST_BASE = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1`;
const ORIGIN = "https://classicvisions.lovable.app";
const TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 20_000;

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

async function restSelect(table, query) {
  const res = await withTimeout(
    (signal) =>
      fetch(`${REST_BASE}/${table}?${query}`, {
        signal,
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }),
    TIMEOUT_MS,
    `rest ${table}`,
  );
  if (!res.ok) throw new Error(`REST select on ${table} failed: ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

// email_send_log rows are inserted asynchronously alongside the enqueue
// call, so give the function a few seconds to finish before declaring it
// missing.
async function pollUntil(fn, label) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const result = await fn();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

function annotate(message) {
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error title=Email pipeline smoke check failed::${message}`);
  }
}

async function checkContactInquiry(nonce) {
  const testEmail = `smoke-test+ci-${nonce}@classicvisions.net`;
  const testName = `CI Smoke Test ${nonce}`;
  const failures = [];

  console.log(`\ncontact-inquiry → ${FUNCTIONS_BASE}/contact-inquiry`);
  console.log(`Test recipient: ${testEmail}`);

  const submitRes = await withTimeout(
    (signal) =>
      fetch(`${FUNCTIONS_BASE}/contact-inquiry`, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", Origin: ORIGIN },
        body: JSON.stringify({
          inquiryType: "contact",
          name: testName,
          email: testEmail,
          message: `Automated smoke test submission (run ${nonce}). Safe to ignore/delete.`,
          pageSlug: "/ci-smoke-test",
          sourceChannel: "website",
          honeypot: "",
        }),
      }),
    TIMEOUT_MS,
    "contact-inquiry submit",
  );

  if (submitRes.status !== 200) {
    const body = await submitRes.text().catch(() => "");
    const msg = `contact-inquiry submission failed with status ${submitRes.status}: ${body}`;
    console.error(`  ✗ ${msg}`);
    return [msg];
  }

  const submitBody = await submitRes.json();
  const inquiryId = submitBody?.inquiryId;
  if (!inquiryId) {
    const msg = `contact-inquiry succeeded but returned no inquiryId: ${JSON.stringify(submitBody)}`;
    console.error(`  ✗ ${msg}`);
    return [msg];
  }
  console.log(`  ✓ Submission accepted (inquiryId ${inquiryId})`);

  // 1. public_inquiries row
  try {
    const rows = await restSelect("public_inquiries", `id=eq.${inquiryId}&select=id,email`);
    if (!rows.length) throw new Error("no matching row");
    console.log("  ✓ public_inquiries row created");
  } catch (err) {
    const msg = `public_inquiries row missing for inquiry ${inquiryId}: ${err.message}`;
    console.error(`  ✗ ${msg}`);
    failures.push(msg);
  }

  // 2. helpdesk ticket — ticket_number is deterministic from the inquiry id
  // (see contact-inquiry/index.ts: `TCK-${insertedInquiry.id.slice(0,8)...}`).
  const ticketNumber = `TCK-${inquiryId.slice(0, 8).toUpperCase()}`;
  try {
    const rows = await restSelect("helpdesk_tickets", `ticket_number=eq.${ticketNumber}&select=id,ticket_number`);
    if (!rows.length) throw new Error("no matching row");
    console.log(`  ✓ Helpdesk ticket ${ticketNumber} created`);
  } catch (err) {
    const msg = `Helpdesk ticket ${ticketNumber} missing: ${err.message}`;
    console.error(`  ✗ ${msg}`);
    failures.push(msg);
  }

  // 3. Both emails queued (admin notification + customer confirmation).
  // idempotency_key isn't selectable via message_id alone, so match on
  // template_name + recipient + recency instead.
  const since = new Date(nonce - 5_000).toISOString();
  for (const { label, recipient } of [
    { label: "contact-inquiry-notification", recipient: null }, // recipient resolved server-side (feedback_email)
    { label: "inquiry-confirmation", recipient: testEmail },
  ]) {
    try {
      const query = recipient
        ? `template_name=eq.${label}&recipient_email=eq.${encodeURIComponent(recipient)}&created_at=gte.${since}&select=status,created_at&order=created_at.desc&limit=1`
        : `template_name=eq.${label}&created_at=gte.${since}&select=status,created_at,recipient_email&order=created_at.desc&limit=1`;
      const rows = await pollUntil(
        () => restSelect("email_send_log", query).then((r) => (r.length ? r : null)),
        `email_send_log row for ${label}`,
      );
      const status = rows[0].status;
      if (!["pending", "sent"].includes(status)) {
        throw new Error(`unexpected status "${status}"`);
      }
      console.log(`  ✓ email_send_log row for ${label} (status: ${status})`);
    } catch (err) {
      const msg = `email_send_log row for ${label} missing or unhealthy: ${err.message}`;
      console.error(`  ✗ ${msg}`);
      failures.push(msg);
    }
  }

  return failures;
}

async function checkCustomerOnboarding(nonce) {
  const apiKey = process.env.CUSTOMER_ONBOARDING_SMOKE_API_KEY;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey || !anonKey) {
    console.log(
      "\ncustomer-onboarding: skipped (CUSTOMER_ONBOARDING_SMOKE_API_KEY / VITE_SUPABASE_PUBLISHABLE_KEY not set)",
    );
    return [];
  }

  const testEmail = `smoke-test+onboarding-${nonce}@classicvisions.net`;
  console.log(`\ncustomer-onboarding → ${FUNCTIONS_BASE}/customer-onboarding`);
  console.log(`Test recipient: ${testEmail}`);

  const submitRes = await withTimeout(
    (signal) =>
      fetch(`${FUNCTIONS_BASE}/customer-onboarding`, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Origin: ORIGIN,
          "x-api-key": apiKey,
          // Gateway-level verify_jwt requires *some* valid signed JWT before
          // our code (and its x-api-key check) ever runs — the publishable
          // key satisfies that. See customer-onboarding/index.ts.
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ smokeTest: true, email: testEmail }),
      }),
    TIMEOUT_MS,
    "customer-onboarding smoke submit",
  );

  if (submitRes.status !== 200) {
    const body = await submitRes.text().catch(() => "");
    const msg = `customer-onboarding smoke call failed with status ${submitRes.status}: ${body}`;
    console.error(`  ✗ ${msg}`);
    return [msg];
  }

  const submitBody = await submitRes.json();
  if (submitBody?.emailQueued !== true) {
    const msg = `customer-onboarding smoke call succeeded but did not queue an email: ${JSON.stringify(submitBody)}`;
    console.error(`  ✗ ${msg}`);
    return [msg];
  }
  console.log("  ✓ Welcome email enqueue accepted");

  const failures = [];
  const since = new Date(nonce - 5_000).toISOString();
  try {
    const query = `template_name=eq.welcome-pricelist&recipient_email=eq.${encodeURIComponent(testEmail)}&created_at=gte.${since}&select=status,created_at&order=created_at.desc&limit=1`;
    const rows = await pollUntil(
      () => restSelect("email_send_log", query).then((r) => (r.length ? r : null)),
      "email_send_log row for welcome-pricelist",
    );
    const status = rows[0].status;
    if (!["pending", "sent"].includes(status)) {
      throw new Error(`unexpected status "${status}"`);
    }
    console.log(`  ✓ email_send_log row for welcome-pricelist (status: ${status})`);
  } catch (err) {
    const msg = `email_send_log row for welcome-pricelist missing or unhealthy: ${err.message}`;
    console.error(`  ✗ ${msg}`);
    failures.push(msg);
  }

  return failures;
}

async function main() {
  const nonce = Date.now();
  const [contactInquiryFailures, customerOnboardingFailures] = [
    await checkContactInquiry(nonce),
    await checkCustomerOnboarding(nonce),
  ];
  const failures = [...contactInquiryFailures, ...customerOnboardingFailures];

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed:`);
    for (const f of failures) {
      console.error(`  - ${f}`);
      annotate(f);
    }
    process.exit(1);
  }

  console.log("\nAll email pipeline checks passed.");
}

main().catch((err) => {
  console.error("Email pipeline smoke run crashed:", err);
  annotate(err.message || String(err));
  process.exit(2);
});
