// Verifies a CRM contact's email addresses and records one result per address in
// contact_email_checks (see docs/CRM_AUTOSEND_PLAN.md). Staff only. Shadow mode:
// nothing reads these results to block a send yet. Provider calls are billable,
// so a per-run cap applies and ?dryRun=1 reports what would be checked.
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import { parseEmailList } from "../_shared/crm/contactEmailMatch.ts";
import { addressesNeedingCheck, looksLikeEmail, mapVerifierStatus } from "../_shared/crm/emailVerification.ts";

const corsPolicy = createCorsPolicy();
const MAX_ADDRESSES_PER_RUN = 10;

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejected = rejectDisallowedOrigin(req, corsPolicy);
  if (rejected) return rejected;
  const headers = { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const auth = await requirePrivilegedAccess(req, headers, {
    allowedRoles: ["admin", "operator"],
    sourceFunction: "crm-email-verify",
  });
  if (auth instanceof Response) return auth;
  const db = auth.supabaseAdminClient;

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const { contact_id } = await req.json().catch(() => ({})) as { contact_id?: string };
  if (!contact_id) return reply(400, { error: "contact_id is required" });

  const apiKey = (Deno.env.get("REOON_API_KEY") ?? "").trim();
  if (!apiKey && !dryRun) return reply(503, { error: "REOON_API_KEY is not configured" });

  const { data: contact, error: cErr } = await db.from("contacts").select("email").eq("id", contact_id).single();
  if (cErr || !contact) return reply(404, { error: "Contact not found" });

  const { data: checks } = await db.from("contact_email_checks").select("email,checked_at").eq("contact_id", contact_id);
  const todo = addressesNeedingCheck(parseEmailList(contact.email).filter(looksLikeEmail), checks ?? [], new Date())
    .slice(0, MAX_ADDRESSES_PER_RUN);
  if (dryRun) return reply(200, { dryRun: true, wouldCheck: todo });

  const results: { email: string; status: string }[] = [];
  for (const email of todo) {
    const url = `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${encodeURIComponent(apiKey)}&mode=quick`;
    let status = "unknown";
    let detail: Record<string, unknown> = {};
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        status = mapVerifierStatus(json?.status);
        detail = { provider_status: json?.status ?? null };
      } else {
        detail = { http_status: res.status };
      }
    } catch (error) {
      detail = { error: error instanceof Error ? error.message : "request failed" };
    }
    await db.from("contact_email_checks").upsert(
      { contact_id, email: email.toLowerCase(), status, provider: "reoon", detail, checked_at: new Date().toISOString() },
      { onConflict: "contact_id,email" },
    );
    results.push({ email, status });
  }
  return reply(200, { checked: results });
});
