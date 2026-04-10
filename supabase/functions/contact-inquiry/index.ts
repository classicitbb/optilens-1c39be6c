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
const SENDER_DOMAIN = "notify.giancarloferrucci.com";
const FROM_DOMAIN = "notify.giancarloferrucci.com";
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

    // Render notification email via React Email template and enqueue it
    const { renderAsync } = await import("npm:@react-email/components@0.0.22");
    const React = await import("npm:react@18.3.1");
    const { template } = await import("../_shared/transactional-email-templates/contact-inquiry-notification.tsx");

    const templateData = {
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

    const html = await renderAsync(
      React.createElement(template.component, templateData)
    );
    const plainText = await renderAsync(
      React.createElement(template.component, templateData),
      { plainText: true }
    );

    const resolvedSubject =
      typeof template.subject === "function"
        ? template.subject(templateData)
        : template.subject;

    const messageId = crypto.randomUUID();
    const idempotencyKey = `contact-inquiry-${insertedInquiry.id}`;

    // Log pending
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "contact-inquiry-notification",
      recipient_email: resolvedRecipient,
      status: "pending",
    });

    // Enqueue directly via RPC (same mechanism as send-transactional-email)
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: [resolvedRecipient],
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: resolvedSubject,
        html,
        text: plainText,
        reply_to: payload.email,
        purpose: "transactional",
        label: "contact-inquiry-notification",
        idempotency_key: idempotencyKey,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("Failed to enqueue notification email", { error: enqueueError });
      // Non-fatal: inquiry was saved, just email failed to queue
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
