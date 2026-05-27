/**
 * Shared email sender — now routes through Lovable Emails queue.
 *
 * Historically this module sent via a cPanel PHP mail relay. That path was
 * blocked by Cloudflare in front of classicvisions.net. We now enqueue
 * directly into the Lovable Emails `transactional_emails` queue, which the
 * `process-email-queue` cron dispatcher drains via the verified Lovable
 * sender domain (support.classicvisions.net).
 *
 * The exported API (`getSmtpConfig`, `sendViaSMTP`, `sendSmtpEmail`,
 * `isSmtpPermanentFailure`) is preserved so existing callers
 * (contact-inquiry, helpdesk-email) keep working without changes.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

export interface SmtpMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}

export interface SmtpConfig {
  /** Default From address for outbound mail */
  from: string;
}

const DEFAULT_FROM = "Classic Visions <support@classicvisions.net>";

export function getSmtpConfig(): SmtpConfig | null {
  // Always available now — the queue lives inside the Supabase project.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  const from = Deno.env.get("SMTP_FROM") || DEFAULT_FROM;
  return { from };
}

export async function sendViaSMTP(
  opts: SmtpMailOptions,
  config: SmtpConfig,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase env not configured for email queue");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const messageId = crypto.randomUUID();

  // Audit log — append-only pending row
  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: "raw",
    recipient_email: opts.to,
    status: "pending",
  });

  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: opts.to,
      from: opts.from ?? config.from,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? "",
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      purpose: "transactional",
      label: "raw",
      idempotency_key: messageId,
      queued_at: new Date().toISOString(),
    },
  });

  if (error) {
    throw new Error(`Email enqueue failed: ${error.message}`);
  }
}

// Retained for API compatibility — queue-based sends are async, so there
// are no synchronous permanent failures from this layer.
export function isSmtpPermanentFailure(_error: unknown): boolean {
  return false;
}

export const sendSmtpEmail = sendViaSMTP;
