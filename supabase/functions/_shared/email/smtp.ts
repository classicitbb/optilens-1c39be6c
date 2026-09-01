/**
 * Shared raw-HTML email sender.
 *
 * Sends through Lovable's managed email API. The exported API
 * (`getSmtpConfig`, `sendViaSMTP`, `sendSmtpEmail`, `isSmtpPermanentFailure`)
 * is preserved so existing callers (contact-inquiry, helpdesk-email,
 * crm-enrich-contacts, platform-health-check) keep working without changes.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { DEFAULT_FROM, sendManagedEmail } from "./managed-send.ts";

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

export function getSmtpConfig(): SmtpConfig | null {
  if (!Deno.env.get("LOVABLE_API_KEY")) return null;
  const from = Deno.env.get("SMTP_FROM") || DEFAULT_FROM;
  return { from };
}

// Per-portal-user override, set from Website Portals > Operations > Feature
// access (feature_key: "auto-notifications"). Absent row means notifications
// are on by default; an explicit enabled:false row is how admins silence a
// test/troubleshooting account without touching the global suppression list.
// Matched by email since most auto-notification senders only have the
// recipient address on hand, not the portal user id.
export async function isAutoNotificationsDisabled(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  email: string,
): Promise<boolean> {
  const normalized = email.toLowerCase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", normalized)
    .maybeSingle();
  if (!profile?.user_id) return false;

  const { data: override } = await supabase
    .from("customer_portal_feature_overrides")
    .select("enabled")
    .eq("user_id", profile.user_id)
    .eq("feature_key", "auto-notifications")
    .maybeSingle();

  return override?.enabled === false;
}

export async function sendViaSMTP(
  opts: SmtpMailOptions,
  config: SmtpConfig,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase env not configured for email audit log");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const messageId = crypto.randomUUID();
  const result = await sendManagedEmail(supabase, {
    messageId,
    to: opts.to,
    from: opts.from ?? config.from,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? "",
    label: "raw",
  });

  if (result.status === "failed") {
    throw new Error(`Email send failed: ${result.error}`);
  }
}

// Retained for API compatibility — the managed API reports permanent failures
// through structured errors handled inside sendManagedEmail.
export function isSmtpPermanentFailure(_error: unknown): boolean {
  return false;
}

export const sendSmtpEmail = sendViaSMTP;
