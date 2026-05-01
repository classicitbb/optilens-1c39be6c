import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.25.76";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { getIpHintFromRequest, getUserAgentFromRequest, logSecurityAuditEvent } from "../_shared/security/auditLogger.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

const FEEDBACK_EMAIL_FALLBACK = "russell@classicvisions.net";
const SITE_NAME = "Classic Visions";
const SENDER_DOMAIN = "support.classicvisions.net";
const FROM_DOMAIN = "classicvisions.net";

// Generate a cryptographically random 32-byte hex token (matches send-transactional-email)
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Get or create a single unsubscribe token per email address
async function getOrCreateUnsubscribeToken(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string> {
  const normalized = email.toLowerCase();
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();

  if (existing && !existing.used_at) return existing.token as string;

  const token = generateToken();
  await supabase
    .from("email_unsubscribe_tokens")
    .upsert(
      { token, email: normalized },
      { onConflict: "email", ignoreDuplicates: true },
    );

  const { data: stored } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();

  return (stored?.token as string) ?? token;
}

const MIN_FORM_FILL_MS = 2500;
const MAX_SUBMISSIONS_PER_HOUR = 5;
const MAX_SUBMISSIONS_PER_EMAIL_PER_HOUR = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 4000;

const inquirySchema = z.object({
  inquiryType: z.string().trim().min(1).max(50).default("contact"),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).nullable().optional(),
  businessName: z.string().trim().max(200).nullable().optional(),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  notes: z.string().trim().max(MAX_MESSAGE_LENGTH).nullable().optional(),
  pageSlug: z.string().trim().min(1).max(255).default("/"),
  sourceChannel: z.string().trim().min(1).max(50).default("website"),
  honeypot: z.string().optional().default(""),
  startedAt: z.string().datetime({ offset: true }),
});

// Build simple HTML for the admin notification email
function buildNotificationHtml(opts: {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  message: string;
  inquiryType: string;
  pageSlug: string;
  submittedAt: string;
}): string {
  const safeMessage = opts.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const phoneLine = opts.phone ? `<tr><td style="padding:6px 0;font-weight:600;color:#374151;width:110px">Phone</td><td style="padding:6px 0;color:#374151">${opts.phone}</td></tr>` : "";
  const bizLine = opts.businessName ? `<tr><td style="padding:6px 0;font-weight:600;color:#374151">Business</td><td style="padding:6px 0;color:#374151">${opts.businessName}</td></tr>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="color:#111827;margin-top:0;font-size:20px">New Contact Inquiry — ${SITE_NAME}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;font-weight:600;color:#374151;width:110px">Name</td><td style="padding:6px 0;color:#374151">${opts.name}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;color:#374151">Email</td><td style="padding:6px 0"><a href="mailto:${opts.email}" style="color:#2563eb">${opts.email}</a></td></tr>
      ${phoneLine}
      ${bizLine}
      <tr><td style="padding:6px 0;font-weight:600;color:#374151">Page</td><td style="padding:6px 0;color:#6b7280;font-size:13px">${opts.pageSlug}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;color:#374151">Type</td><td style="padding:6px 0;color:#6b7280;font-size:13px">${opts.inquiryType}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;color:#374151">Sent</td><td style="padding:6px 0;color:#6b7280;font-size:13px">${opts.submittedAt}</td></tr>
    </table>
    <div style="margin-top:20px;background:#f9fafb;border-left:3px solid #111827;padding:16px;border-radius:4px">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${safeMessage}</p>
    </div>
    <p style="margin-top:20px;font-size:13px;color:#6b7280">
      Reply directly to this email to respond to ${opts.name}.
    </p>
  </div>
</body>
</html>`;
}

// Build simple HTML for the customer confirmation email
function buildConfirmationHtml(opts: {
  name: string;
  message: string;
}): string {
  const safeMessage = opts.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="color:#111827;margin-top:0;font-size:20px">We received your message</h2>
    <p style="color:#374151">Hi ${opts.name},</p>
    <p style="color:#374151">Thank you for contacting <strong>${SITE_NAME}</strong>. We've received your message and our team will get back to you within 24 hours.</p>
    <div style="margin:20px 0;background:#f9fafb;border-left:3px solid #111827;padding:16px;border-radius:4px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#6b7280">YOUR MESSAGE</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${safeMessage}</p>
    </div>
    <p style="color:#6b7280;font-size:13px">If you didn't send this, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">${SITE_NAME} · This is an automated confirmation. Please do not reply to this email.</p>
  </div>
</body>
</html>`;
}

// Send an email directly via Resend API (same pattern as helpdesk-email)
async function sendViaResend(opts: {
  resendApiKey: string;
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  label: string;
}): Promise<void> {
  const body: Record<string, unknown> = {
    from: opts.from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
  };
  if (opts.replyTo) body.reply_to = opts.replyTo;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend ${opts.label} error ${resp.status}: ${text}`);
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 20_000) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase server configuration");
    }

    const payload = inquirySchema.parse(await req.json());
    const sourcePath = new URL(req.url).pathname;
    const ipHint = getIpHintFromRequest(req);
    const userAgent = getUserAgentFromRequest(req) ?? "unknown";

    if (payload.honeypot.trim()) {
      await logSecurityAuditEvent({
        category: "edge_security",
        eventType: "abuse.bot_detected",
        severity: "high",
        statusCode: 400,
        sourceFunction: "contact-inquiry",
        sourcePath,
        ipHint,
        userAgent,
        payload: { reason: "honeypot_populated" },
      });
      return new Response(JSON.stringify({ error: "Spam rejected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startedAtMs = Date.parse(payload.startedAt);
    if (!Number.isFinite(startedAtMs) || Date.now() - startedAtMs < MIN_FORM_FILL_MS) {
      await logSecurityAuditEvent({
        category: "edge_security",
        eventType: "abuse.bot_detected",
        severity: "medium",
        statusCode: 400,
        sourceFunction: "contact-inquiry",
        sourcePath,
        ipHint,
        userAgent,
        payload: { reason: "form_fill_too_fast", minFillMs: MIN_FORM_FILL_MS },
      });
      return new Response(JSON.stringify({ error: "Submission blocked by bot protection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: companySettings, error: companySettingsError } = await supabase
      .from("company_settings")
      .select("feedback_email")
      .limit(1)
      .maybeSingle();

    if (companySettingsError) throw companySettingsError;

    const resolvedRecipient = companySettings?.feedback_email?.trim() || FEEDBACK_EMAIL_FALLBACK;

    const rateLimitSince = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    if (ipHint) {
      const { count, error: rateLimitError } = await supabase
        .from("public_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("ip_hint", ipHint)
        .gte("created_at", rateLimitSince);

      if (rateLimitError) throw rateLimitError;
      if ((count ?? 0) >= MAX_SUBMISSIONS_PER_HOUR) {
        await logSecurityAuditEvent({
          category: "edge_security",
          eventType: "abuse.rate_limit",
          severity: "high",
          statusCode: 429,
          sourceFunction: "contact-inquiry",
          sourcePath,
          ipHint,
          userAgent,
          payload: { reason: "ip_hourly_limit", maxPerHour: MAX_SUBMISSIONS_PER_HOUR },
        });
        return new Response(JSON.stringify({ error: "Too many submissions, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { count: emailCount, error: emailRateLimitError } = await supabase
      .from("public_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("email", payload.email)
      .gte("created_at", rateLimitSince);

    if (emailRateLimitError) throw emailRateLimitError;
    if ((emailCount ?? 0) >= MAX_SUBMISSIONS_PER_EMAIL_PER_HOUR) {
      await logSecurityAuditEvent({
        category: "edge_security",
        eventType: "abuse.rate_limit",
        severity: "high",
        statusCode: 429,
        sourceFunction: "contact-inquiry",
        sourcePath,
        ipHint,
        userAgent,
        payload: { reason: "email_hourly_limit", maxPerHour: MAX_SUBMISSIONS_PER_EMAIL_PER_HOUR, emailDomain: payload.email.split("@")[1] ?? "unknown" },
      });
      return new Response(JSON.stringify({ error: "Too many submissions, please try again later" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: insertedInquiry, error: insertError } = await supabase
      .from("public_inquiries")
      .insert({
        inquiry_type: payload.inquiryType,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        business_name: payload.businessName || null,
        message: payload.message,
        page_slug: payload.pageSlug,
        source_channel: payload.sourceChannel,
        honeypot: null,
        ip_hint: ipHint,
        notes: payload.notes || JSON.stringify({ userAgent, delivered_to: resolvedRecipient }),
      })
      .select("id, created_at")
      .single();

    if (insertError) throw insertError;

    const fromAddress = `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`;
    const submittedAt = new Date(insertedInquiry.created_at).toUTCString();

    if (resendApiKey) {
      // Send both emails directly via Resend — no queue dependency, immediate delivery.
      await Promise.allSettled([
        sendViaResend({
          resendApiKey,
          to: resolvedRecipient,
          from: fromAddress,
          replyTo: payload.email,
          subject: `New Inquiry from ${payload.name} — ${SITE_NAME}`,
          html: buildNotificationHtml({
            name: payload.name,
            email: payload.email,
            phone: payload.phone || "",
            businessName: payload.businessName || "",
            message: payload.message,
            inquiryType: payload.inquiryType,
            pageSlug: payload.pageSlug,
            submittedAt,
          }),
          label: "contact-inquiry-notification",
        }).catch((err) => console.error("Resend admin notification failed", { error: String(err) })),

        sendViaResend({
          resendApiKey,
          to: payload.email,
          from: fromAddress,
          subject: `We received your message — ${SITE_NAME}`,
          html: buildConfirmationHtml({
            name: payload.name,
            message: payload.message,
          }),
          label: "inquiry-confirmation",
        }).catch((err) => console.error("Resend customer confirmation failed", { error: String(err) })),
      ]);
    } else {
      console.warn("RESEND_API_KEY not configured — falling back to email queue only");
    }

    // Also enqueue via the queue system as an audit trail / fallback if Resend
    // was not configured or failed.
    try {
      const { renderAsync } = await import("npm:@react-email/components@0.0.22");
      const React = await import("npm:react@18.3.1");
      const { template: notificationTemplate } = await import(
        "../_shared/transactional-email-templates/contact-inquiry-notification.tsx"
      );
      const { template: confirmationTemplate } = await import(
        "../_shared/transactional-email-templates/inquiry-confirmation.tsx"
      );

      const notificationData = {
        inquiryType: payload.inquiryType,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || "",
        businessName: payload.businessName || "",
        message: payload.message,
        pageSlug: payload.pageSlug,
        sourceChannel: payload.sourceChannel,
        submittedAt: insertedInquiry.created_at,
        notes: payload.notes || "",
      };

      const confirmationData = {
        name: payload.name,
        inquiryType: payload.inquiryType,
        siteUrl: "https://classicvisions.lovable.app",
      };

      const enqueueRenderedEmail = async (
        label: string,
        recipient: string,
        template: typeof notificationTemplate,
        data: Record<string, unknown>,
        idempotencyKey: string,
        replyTo?: string,
      ) => {
        const messageId = crypto.randomUUID();
        const html = await renderAsync(React.createElement(template.component, data));
        const text = await renderAsync(React.createElement(template.component, data), { plainText: true });
        const subject = typeof template.subject === "function" ? template.subject(data) : template.subject;
        const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, recipient);

        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: label,
          recipient_email: recipient,
          status: "pending",
        });

        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: recipient,
            from: `${SITE_NAME} <inquiry@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            ...(replyTo ? { reply_to: replyTo } : {}),
            purpose: "transactional",
            label,
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          console.error(`Failed to enqueue ${label}`, { error: enqueueError });
        }
      };

      await Promise.all([
        enqueueRenderedEmail(
          "contact-inquiry-notification",
          resolvedRecipient,
          notificationTemplate,
          notificationData,
          `contact-inquiry-${insertedInquiry.id}`,
          payload.email,
        ),
        enqueueRenderedEmail(
          "inquiry-confirmation",
          payload.email,
          confirmationTemplate,
          confirmationData,
          `inquiry-confirm-${insertedInquiry.id}`,
        ),
      ]);
    } catch (queueErr) {
      console.error("Email queue enqueue failed (non-fatal)", {
        error: queueErr instanceof Error ? queueErr.message : String(queueErr),
      });
    }

    return new Response(JSON.stringify({ success: true, inquiryId: insertedInquiry.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("contact-inquiry failed", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
