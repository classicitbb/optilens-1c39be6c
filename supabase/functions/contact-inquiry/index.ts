import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { z } from "npm:zod@3.25.76";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { getIpHintFromRequest, getUserAgentFromRequest, logSecurityAuditEvent } from "../_shared/security/auditLogger.ts";
import { getOrCreateUnsubscribeToken, getSmtpConfig, sendViaSMTP } from "../_shared/email/smtp.ts";
import { template as notificationTemplate } from "../_shared/transactional-email-templates/contact-inquiry-notification.tsx";
import { template as confirmationTemplate } from "../_shared/transactional-email-templates/inquiry-confirmation.tsx";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

const FEEDBACK_EMAIL_FALLBACK = "russell@classicvisions.net";
const SITE_NAME = "Classic Visions";

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
  // Kept optional for clients that include it, but it is not used as a spam
  // decision: rapid typing and password-manager autofill are valid input.
  startedAt: z.string().datetime({ offset: true }).optional(),
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

    const smtpConfig = getSmtpConfig();
    if (!smtpConfig) {
      console.warn("SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing) — emails will not send");
    }

    const payload = inquirySchema.parse(await req.json());
    const sourcePath = new URL(req.url).pathname;
    const ipHint = getIpHintFromRequest(req);
    const userAgent = getUserAgentFromRequest(req) ?? "unknown";

    const isHomepageContactForm = payload.inquiryType === "contact";

    // Silent success response used only for the homepage contact form so bots
    // cannot learn they were blocked. Mirrors the shape of a real success.
    const silentSuccess = () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (payload.honeypot.trim()) {
      await logSecurityAuditEvent({
        category: "edge_security",
        eventType: "abuse.bot_detected",
        severity: "high",
        statusCode: isHomepageContactForm ? 200 : 400,
        sourceFunction: "contact-inquiry",
        sourcePath,
        ipHint,
        userAgent,
        payload: { reason: "honeypot_populated", inquiryType: payload.inquiryType, silent: isHomepageContactForm },
      });
      if (isHomepageContactForm) return silentSuccess();
      return new Response(JSON.stringify({ error: "Spam rejected" }), {
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

    // Create helpdesk ticket so submissions appear in the helpdesk overview
    try {
      let contactId: string | null = null;
      const { data: matchedContact } = await supabase
        .from("contacts")
        .select("id")
        .ilike("email", payload.email)
        .maybeSingle();
      if (matchedContact) contactId = matchedContact.id;

      const ticketNumber = `TCK-${insertedInquiry.id.slice(0, 8).toUpperCase()}`;
      const titleName = (payload.businessName?.trim() || payload.name).slice(0, 200);
      const TICKET_TITLE_LABELS: Record<string, string> = {
        trade_account: `Trade Account: ${titleName}`,
        "website-design-lead": `Website Design Lead: ${titleName}`,
        price_list: `Price List Request: ${titleName}`,
        zenvue_wholesale: `ZenVue Wholesale: ${titleName}`,
      };
      const ticketTitle = TICKET_TITLE_LABELS[payload.inquiryType]
        ?? `${payload.inquiryType.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: ${payload.name}`;

      const descParts = [payload.message];
      if (payload.businessName) descParts.push(`Business: ${payload.businessName}`);
      if (payload.phone) descParts.push(`Phone: ${payload.phone}`);
      if (payload.notes) descParts.push(`\nAdditional Details:\n${payload.notes}`);
      const description = descParts.join("\n").slice(0, 10000);

      const validChannels = new Set(["manual", "email", "phone", "chat", "portal", "api", "odoo_sync"]);
      const ticketChannel = validChannels.has(payload.sourceChannel) ? payload.sourceChannel : "portal";

      const { data: ticket, error: ticketErr } = await supabase
        .from("helpdesk_tickets")
        .insert({
          ticket_number: ticketNumber,
          title: ticketTitle.slice(0, 255),
          description,
          priority: 1,
          source_channel: ticketChannel,
          customer_email: payload.email,
          partner_contact_id: contactId,
          opened_at: insertedInquiry.created_at,
        })
        .select("id")
        .single();

      if (ticketErr) {
        console.error("Helpdesk ticket insert error:", ticketErr);
      } else {
        await supabase.from("helpdesk_ticket_events").insert({
          ticket_id: ticket.id,
          event_type: "ticket_created",
          payload: {
            source_channel: ticketChannel,
            from_address: payload.email,
            from_name: payload.name,
            inquiry_id: insertedInquiry.id,
            inquiry_type: payload.inquiryType,
          },
        });
        console.log(`Helpdesk ticket ${ticketNumber} created from ${payload.inquiryType} form (contact: ${contactId ?? "none"})`);
      }
    } catch (ticketCreateErr) {
      console.error("Helpdesk ticket creation failed (non-fatal):", ticketCreateErr);
    }

    const submittedAt = new Date(insertedInquiry.created_at).toUTCString();

    // Send both emails immediately via SMTP (your own mail server)
    if (smtpConfig) {
      const notificationHtml = await renderAsync(React.createElement(notificationTemplate.component, {
        inquiryType: payload.inquiryType,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || "",
        businessName: payload.businessName || "",
        message: payload.message,
        pageSlug: payload.pageSlug,
        sourceChannel: payload.sourceChannel,
        submittedAt,
        notes: payload.notes || "",
      }));
      const confirmationHtml = await renderAsync(React.createElement(confirmationTemplate.component, {
        name: payload.name,
        inquiryType: payload.inquiryType,
        message: payload.message,
        siteUrl: "https://classicvisions.net",
      }));
      await Promise.allSettled([
        sendViaSMTP(
          {
            to: resolvedRecipient,
            replyTo: payload.email,
            subject: payload.inquiryType === "website-design-lead"
              ? `Website design quote request from ${payload.name} — ${SITE_NAME}`
              : `New Inquiry from ${payload.name} — ${SITE_NAME}`,
            html: notificationHtml,
          },
          smtpConfig,
        ).catch((err) => console.error("SMTP admin notification failed", { error: String(err) })),

        sendViaSMTP(
          {
            to: payload.email,
            subject: `We received your message — ${SITE_NAME}`,
            html: confirmationHtml,
          },
          smtpConfig,
        ).catch((err) => console.error("SMTP customer confirmation failed", { error: String(err) })),
      ]);
    }

    // Enqueue for audit trail and as backup if SMTP was not yet configured
    try {
      const { renderAsync } = await import("npm:@react-email/components@0.0.22");
      const React = await import("npm:react@18.3.1");
      const { template: notificationTemplate } = await import(
        "../_shared/transactional-email-templates/contact-inquiry-notification.tsx"
      );
      const { template: confirmationTemplate } = await import(
        "../_shared/transactional-email-templates/inquiry-confirmation.tsx"
      );

      const enqueueRenderedEmail = async (
        label: string,
        recipient: string,
        template: typeof notificationTemplate,
        data: Record<string, unknown>,
        idempotencyKey: string,
        replyTo?: string,
      ) => {
        const messageId = crypto.randomUUID();
        const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, recipient);
        const renderData = {
          ...data,
          unsubscribeUrl: `https://classicvisions.net/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
        };
        const html = await renderAsync(React.createElement(template.component, renderData));
        const text = await renderAsync(React.createElement(template.component, renderData), { plainText: true });
        const subject = typeof template.subject === "function" ? template.subject(data) : template.subject;

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
            from: smtpConfig?.from ?? `notify@classicvisions.net`,
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
          {
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
          },
          `contact-inquiry-${insertedInquiry.id}`,
          payload.email,
        ),
        enqueueRenderedEmail(
          "inquiry-confirmation",
          payload.email,
          confirmationTemplate,
          {
            name: payload.name,
            inquiryType: payload.inquiryType,
            message: payload.message,
            siteUrl: "https://classicvisions.net",
          },
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
    console.error("contact-inquiry failed", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
