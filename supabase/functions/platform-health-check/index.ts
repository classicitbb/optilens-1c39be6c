// Lightweight platform health check for the agent surfaces.
//
// Probes, in order:
//   1. MCP endpoint — CORS preflight and an unauthenticated JSON-RPC POST.
//      A healthy server answers the preflight with 200/204 and rejects the
//      unauthenticated POST with 401 + WWW-Authenticate. A 500 (the historic
//      "mcp is not defined" bundle bug) is a failure.
//   2. Helpdesk SLA schema — selects the exact columns the SLA hooks use, so a
//      column rename (policy_id vs sla_policy_id) is caught here rather than
//      in a staff member's browser.
//   3. Portal Copilot — preflight reachability.
//
// Results are recorded through public.record_edge_function_health and, on a
// failure, emailed to the ops/feedback address.
//
// Runs on a schedule (pg_cron) and can be invoked manually by an admin.

import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendSmtpEmail, getSmtpConfig } from "../_shared/email/smtp.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type",
  allowMethods: "POST, GET, OPTIONS",
});

// Shape required by public.record_edge_function_health.
type Check = { name: string; healthy: boolean; error?: string | null; checkedAt: string };

const now = () => new Date().toISOString();

const functionsBase = () => `${(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "")}/functions/v1`;

const probeMcp = async (): Promise<Check> => {
  const url = `${functionsBase()}/mcp`;
  try {
    const preflight = await fetch(url, {
      method: "OPTIONS",
      headers: { Origin: "https://classicvisions.lovable.app", "Access-Control-Request-Method": "POST" },
    });
    await preflight.text().catch(() => "");
    if (preflight.status >= 400) {
      return { name: "mcp", healthy: false, error: `preflight returned ${preflight.status}`, checkedAt: now() };
    }
    const post = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    const body = (await post.text().catch(() => "")).slice(0, 300);
    // 401 = healthy server correctly demanding OAuth. 5xx = broken bundle.
    if (post.status >= 500) {
      return { name: "mcp", healthy: false, error: `POST returned ${post.status}: ${body}`, checkedAt: now() };
    }
    return { name: "mcp", healthy: true, error: null, checkedAt: now() };
  } catch (error) {
    return { name: "mcp", healthy: false, error: error instanceof Error ? error.message : "probe failed", checkedAt: now() };
  }
};

const probeCopilot = async (): Promise<Check> => {
  try {
    const response = await fetch(`${functionsBase()}/portal-copilot`, {
      method: "OPTIONS",
      headers: { Origin: "https://classicvisions.lovable.app", "Access-Control-Request-Method": "POST" },
    });
    await response.text().catch(() => "");
    return response.status < 400
      ? { name: "portal-copilot", healthy: true, error: null, checkedAt: now() }
      : { name: "portal-copilot", healthy: false, error: `preflight returned ${response.status}`, checkedAt: now() };
  } catch (error) {
    return { name: "portal-copilot", healthy: false, error: error instanceof Error ? error.message : "probe failed", checkedAt: now() };
  }
};

const probeSlaSchema = async (db: any): Promise<Check> => {
  const { error } = await db
    .from("helpdesk_ticket_sla_status")
    .select("id,ticket_id,sla_policy_id,deadline_at,reached_at,status")
    .limit(1);
  return {
    name: "helpdesk-sla-schema",
    healthy: !error,
    error: error ? error.message : null,
    checkedAt: now(),
  };
};

const alert = async (db: any, failures: Check[]) => {
  try {
    const { data: settings } = await db.from("company_settings").select("feedback_email").maybeSingle();
    const to = (settings?.feedback_email ?? "").trim();
    if (!to || !getSmtpConfig()) return;
    const rows = failures
      .map((check) => `<li><strong>${check.name}</strong>: ${check.error ?? "unhealthy"}</li>`)
      .join("");
    await sendSmtpEmail({
      to,
      subject: `[OpticAdmin] Platform health check failed (${failures.length})`,
      html: `<p>The scheduled platform health check found failing agent surfaces:</p><ul>${rows}</ul><p>Checked at ${now()}.</p>`,
      text: failures.map((check) => `${check.name}: ${check.error ?? "unhealthy"}`).join("\n"),
    });
  } catch {
    // Alerting must never fail the health check itself.
  }
};

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejected = rejectDisallowedOrigin(req, corsPolicy);
  if (rejected) return rejected;
  const headers = { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Supabase environment is not configured" }), { status: 500, headers });
  }
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const source = new URL(req.url).searchParams.get("source") === "manual" ? "manual" : "scheduled";
  const checks = [await probeMcp(), await probeCopilot(), await probeSlaSchema(db)];
  const failures = checks.filter((check) => !check.healthy);

  const { error: recordError } = await db.rpc("record_edge_function_health", {
    p_source: source,
    p_release_sha: null,
    p_checks: checks,
  });

  if (failures.length > 0) await alert(db, failures);

  return new Response(
    JSON.stringify({
      ok: failures.length === 0,
      source,
      checked: checks.length,
      failed: failures.length,
      checks,
      recorded: !recordError,
      recordError: recordError?.message ?? null,
    }),
    { status: 200, headers },
  );
});
