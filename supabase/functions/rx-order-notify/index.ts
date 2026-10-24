// Rx order notifications.
//
//   { action: "customer", submissionId, event: "released" | "shipped" }
//       staff only. Emails the account's customer about one order. It is a deliberate
//       staff choice each time (the workspace's "Email customer" switch is off by
//       default) and is sent at most once per order and event.
//
//   { action: "staff-alerts" }
//       scheduled (pg_cron, every 30 minutes, token in rx_capture_settings). Emails
//       staff — company_settings.feedback_email — about orders that failed to reach
//       the lab, or that the lab has held for a day, once each.
import { createClient } from "npm:@supabase/supabase-js@2";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import { isAutoNotificationsDisabled } from "../_shared/email/smtp.ts";
import { sendManagedEmail } from "../_shared/email/managed-send.ts";
import { TEMPLATES } from "../_shared/transactional-email-templates/registry.ts";
import { dueAlerts, type AlertEvent, type AlertSubmission } from "../_shared/rx-order/alerts.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type, x-rx-notify-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  allowMethods: "POST, OPTIONS",
});

const json = (req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" } });

const SITE = () => Deno.env.get("APP_BASE_URL") ?? "https://classicvisions.net";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const sameToken = (a: string, b: string) => {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// deno-lint-ignore no-explicit-any
type Db = any;

async function notifyCustomer(db: Db, req: Request, actorId: string, submissionId: string, event: string) {
  if (!["released", "shipped"].includes(event)) return json(req, 400, { error: "event must be released or shipped" });
  const { data: sub } = await db.from("rx_order_submissions").select("id, quote_id, account_id, status, payload").eq("id", submissionId).maybeSingle();
  if (!sub) return json(req, 404, { error: "Submission not found" });
  if (!["approved", "claimed", "submitted"].includes(sub.status)) return json(req, 409, { error: "Only a released order can be announced." });

  const messageId = `rx-order-${event}-${submissionId}`;
  const { data: already } = await db.from("email_send_log").select("id").eq("message_id", messageId).eq("status", "sent").limit(1).maybeSingle();
  if (already) return json(req, 200, { status: "already_sent" });

  const { data: customer } = await db.from("customers").select("name, email").eq("id", sub.account_id).maybeSingle();
  const recipient = String(customer?.email ?? "").trim();
  if (!recipient) return json(req, 422, { error: "This account has no email address." });
  if (await isAutoNotificationsDisabled(db, recipient)) return json(req, 200, { status: "suppressed" });

  const { data: quote } = await db.from("quotes").select("quote_number, rx_payload").eq("id", sub.quote_id).maybeSingle();
  const patient = quote?.rx_payload?.patient ?? {};
  const data = {
    customerName: customer?.name || "there",
    quoteNumber: quote?.quote_number ?? sub.payload?.quote?.quote_number ?? "",
    patientName: `${patient.first ?? ""} ${patient.last ?? ""}`.trim(),
    event,
    siteUrl: SITE(),
  };
  const template = TEMPLATES["rx-order-update"];
  const html = await renderAsync(React.createElement(template.component, data));
  const text = await renderAsync(React.createElement(template.component, data), { plainText: true });
  const subject = typeof template.subject === "function" ? template.subject(data) : template.subject;

  const result = await sendManagedEmail(db, {
    messageId, to: recipient, from: "Classic Visions <noreply@classicvisions.net>", subject, html, text, label: "rx-order-update", idempotencyKey: messageId,
  });
  if (result.status === "failed") return json(req, 502, { error: "The email could not be sent." });
  if (result.status === "sent") {
    await db.from("rx_order_events").insert({ quote_id: sub.quote_id, submission_id: sub.id, actor_id: actorId, event: `customer_emailed_${event}`, detail: { to: recipient } });
  }
  return json(req, 200, { status: result.status });
}

async function staffAlerts(db: Db, req: Request) {
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  const { data: subs } = await db.from("rx_order_submissions")
    .select("id, quote_id, status, last_error, lab_status, lab_status_detail, lab_status_at, created_at")
    .in("status", ["failed", "approved", "claimed", "submitted"]).gte("created_at", since).limit(1000);
  const ids = ((subs ?? []) as AlertSubmission[]).map((s) => s.id);
  if (!ids.length) return json(req, 200, { alerts: 0 });
  const { data: events } = await db.from("rx_order_events").select("submission_id, event, created_at").in("submission_id", ids).in("event", ["staff_alerted", "submission_failed"]);

  const alerts = dueAlerts(subs as AlertSubmission[], (events ?? []) as AlertEvent[], new Date());
  if (!alerts.length) return json(req, 200, { alerts: 0 });

  const { data: settings } = await db.from("company_settings").select("feedback_email").maybeSingle();
  const to = String(settings?.feedback_email ?? "").trim();
  if (!to) return json(req, 200, { alerts: alerts.length, emailed: false, reason: "No staff email is set in company settings." });

  const { data: quotes } = await db.from("quotes").select("id, quote_number").in("id", alerts.map((a) => a.quoteId));
  const number = new Map(((quotes ?? []) as { id: string; quote_number: string }[]).map((q) => [q.id, q.quote_number]));
  const rows = alerts.map((a) => `<li><b>${esc(number.get(a.quoteId) ?? a.quoteId.slice(0, 8))}</b> — ${a.kind === "failed" ? "failed to reach the lab" : "on hold at the lab"}: ${esc(a.detail)}</li>`).join("");
  const html = `<p>${alerts.length} Rx order${alerts.length === 1 ? " needs" : "s need"} attention.</p><ul>${rows}</ul><p><a href="${SITE()}/admin/orders/rx">Open Rx Orders</a></p>`;
  const messageId = `rx-order-staff-alert-${crypto.randomUUID()}`;
  const result = await sendManagedEmail(db, {
    messageId, to, subject: `[Classic Visions] ${alerts.length} Rx order${alerts.length === 1 ? "" : "s"} need attention`, html, label: "rx-order-staff-alert",
  });
  if (result.status === "failed") return json(req, 502, { error: "The alert email could not be sent." });
  // remember them so the next run stays quiet until something changes
  await db.from("rx_order_events").insert(alerts.map((a) => ({ quote_id: a.quoteId, submission_id: a.submissionId, event: "staff_alerted", detail: { kind: a.kind } })));
  return json(req, 200, { alerts: alerts.length, emailed: result.status === "sent" });
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejected = rejectDisallowedOrigin(req, corsPolicy);
  if (rejected) return rejected;
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === "staff-alerts") {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json(req, 500, { error: "Not configured" });
    const db = createClient(url, key);
    const { data: settings } = await db.from("rx_capture_settings").select("notify_token").eq("id", true).maybeSingle();
    if (!sameToken(req.headers.get("x-rx-notify-token") ?? "", settings?.notify_token ?? "")) return json(req, 401, { error: "Unauthorized" });
    return staffAlerts(db, req);
  }

  if (action === "customer") {
    const auth = await requirePrivilegedAccess(req, getCorsHeaders(req, corsPolicy), { allowedRoles: ["admin", "operator"], sourceFunction: "rx-order-notify" });
    if (auth instanceof Response) return auth;
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
    if (!submissionId) return json(req, 400, { error: "submissionId is required" });
    return notifyCustomer(auth.supabaseAdminClient, req, auth.user.id, submissionId, String(body?.event ?? ""));
  }

  return json(req, 400, { error: "Unknown action" });
});
