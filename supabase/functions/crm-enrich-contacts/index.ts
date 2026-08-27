// Continuous CRM contact enrichment from public web sources.
//
// Blank contact fields are filled silently with the source URL, retrieval date
// and confidence recorded; anything contradicting an existing value is left for
// an administrator to approve. All of that policy lives in
// _shared/enrichment/contactEnrichment.ts — this function is the scheduler and
// batch driver around it.
//
// Invoked three ways:
//   * pg_cron nightly sweep       POST ?source=scheduled  + X-Scheduler-Secret
//   * pg_cron new-contact worker  POST ?source=oncreate   + X-Scheduler-Secret
//   * an administrator            POST { contactId } or { limit }, normal auth
//
// Add ?dryRun=1 to record what WOULD change without touching any contact.

import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendSmtpEmail, getSmtpConfig } from "../_shared/email/smtp.ts";
import { enrichContact, type EnrichableContact, type TriggerSource } from "../_shared/enrichment/contactEnrichment.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-scheduler-secret, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

/** Google Places bills per Text Search AND per Details call, so cap the day. */
const DAILY_ATTEMPT_CAP = 150;
const DEFAULT_BATCH = 40;

/**
 * get_lead_provider_credentials ends in `has_role(auth.uid(),'admin')`, and
 * auth.uid() is NULL under a service-role client — it would return {} and make
 * every scheduled run a silent no-op. Read the table directly instead.
 */
const resolvePlacesKey = async (db: any): Promise<string> => {
  const { data } = await db
    .from("lead_provider_credentials")
    .select("credential")
    .eq("tenant_key", "default")
    .eq("provider", "google_places")
    .maybeSingle();
  const stored = typeof data?.credential === "string" ? data.credential.trim() : "";
  return stored || (Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "").trim();
};

const alert = async (db: any, message: string) => {
  try {
    const { data: settings } = await db.from("company_settings").select("feedback_email").maybeSingle();
    const to = (settings?.feedback_email ?? "").trim();
    const smtpConfig = getSmtpConfig();
    if (!to || !smtpConfig) return;
    await sendSmtpEmail({
      to,
      subject: "[OpticAdmin] CRM contact enrichment failed",
      html: `<p>The scheduled CRM contact enrichment run failed.</p><p>${message}</p>`,
      text: message,
    }, smtpConfig);
  } catch {
    // Alerting must never fail the run itself.
  }
};

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejected = rejectDisallowedOrigin(req, corsPolicy);
  if (rejected) return rejected;
  const headers = { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  // Scheduler first, so cron never pays for an auth round-trip. The two auth
  // modes are mutually exclusive: a scheduled call may not name a contact.
  const providedSecret = req.headers.get("x-scheduler-secret");
  let triggerSource: TriggerSource;
  let db: any;

  if (providedSecret) {
    const expected = Deno.env.get("CRM_ENRICH_SCHEDULER_SECRET");
    if (!expected || providedSecret !== expected) return reply(401, { error: "Unauthorized" });
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return reply(500, { error: "Supabase environment is not configured" });
    db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    triggerSource = url.searchParams.get("source") === "oncreate" ? "oncreate" : "scheduled";
  } else {
    const auth = await requirePrivilegedAccess(req, headers, {
      allowedRoles: ["admin"],
      sourceFunction: "crm-enrich-contacts",
    });
    if (auth instanceof Response) return auth;
    db = auth.supabaseAdminClient;
    triggerSource = "manual";
  }

  const apiKey = await resolvePlacesKey(db);
  if (!apiKey) return reply(503, { error: "Google Places is not configured. Add a google_places credential in Lead Settings." });

  // Spend guard. Counts every attempt, including no-match and error ones,
  // because each of those still cost a Text Search call.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: attemptsToday } = await db
    .from("contact_enrichment_attempts")
    .select("id", { count: "exact", head: true })
    .gte("attempted_at", since);
  if ((attemptsToday ?? 0) >= DAILY_ATTEMPT_CAP) {
    return reply(200, { ok: true, skipped: "daily_cap", attemptsToday, cap: DAILY_ATTEMPT_CAP });
  }
  const remainingToday = DAILY_ATTEMPT_CAP - (attemptsToday ?? 0);

  // ------------------------------------------------------- select the work
  const requestedContactId = typeof body.contactId === "string" ? body.contactId.trim() : "";
  let contacts: EnrichableContact[] = [];

  if (requestedContactId) {
    if (triggerSource !== "manual") return reply(400, { error: "contactId is only accepted on an administrator request" });
    const { data, error } = await db
      .from("contacts")
      .select("id,name,business_name,street,city,state,zip,country,country_code,website,phone,google_place_id")
      .eq("id", requestedContactId)
      .maybeSingle();
    if (error) return reply(500, { error: error.message });
    if (!data) return reply(404, { error: "Contact not found" });
    contacts = [data as EnrichableContact];
    triggerSource = "manual";
  } else {
    const requestedLimit = Number(body.limit);
    const limit = Math.min(
      Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.floor(requestedLimit) : DEFAULT_BATCH,
      remainingToday,
    );
    const { data, error } = await db.rpc("select_contacts_for_enrichment", { p_limit: limit, p_mode: triggerSource === "oncreate" ? "oncreate" : "scheduled" });
    if (error) {
      await alert(db, `Selecting contacts failed: ${error.message}`);
      return reply(500, { error: error.message });
    }
    contacts = (data ?? []) as EnrichableContact[];
  }

  // -------------------------------------------------------------- enrich
  const batchId = crypto.randomUUID();
  const results = [];
  let applied = 0;
  let pendingReview = 0;
  const failures: string[] = [];

  for (const contact of contacts) {
    try {
      const result = await enrichContact(db, apiKey, contact, triggerSource, { batchId, dryRun });
      applied += result.applied.length;
      pendingReview += result.pendingReview.length;
      results.push({
        contactId: result.contactId,
        contactLabel: result.contactLabel,
        outcome: result.outcome,
        confidence: result.confidence,
        applied: result.applied.map((finding) => finding.field),
        pendingReview: result.pendingReview.map((finding) => finding.field),
        detail: result.detail ?? null,
      });
    } catch (error) {
      // One bad contact must not abandon the rest of the batch.
      const message = error instanceof Error ? error.message : "enrichment failed";
      failures.push(`${contact.id}: ${message}`);
      results.push({ contactId: contact.id, outcome: "error", detail: message });
    }
  }

  if (failures.length && triggerSource !== "manual") {
    await alert(db, `${failures.length} of ${contacts.length} contacts failed:<br>${failures.join("<br>")}`);
  }

  return reply(200, {
    ok: failures.length === 0,
    source: triggerSource,
    dryRun,
    batchId,
    processed: contacts.length,
    applied,
    pendingReview,
    failed: failures.length,
    results,
  });
});
