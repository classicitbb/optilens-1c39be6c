/**
 * Shared email sender via cPanel PHP mail relay.
 *
 * Sends an HTTPS POST to MAIL_RELAY_URL (a PHP script on the cPanel server)
 * which handles the actual SMTP delivery. This works around Deno Deploy's
 * restriction on raw TCP connections (which SMTP requires).
 *
 * Required Supabase secrets:
 *   MAIL_RELAY_URL    — e.g. https://classicvisions.net/mail-relay.php
 *   MAIL_RELAY_SECRET — shared secret matching the PHP script
 *
 * Optional:
 *   SMTP_FROM — display From address (falls back to notify@classicvisions.net)
 */

export interface SmtpMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}

export interface SmtpConfig {
  relayUrl: string;
  relaySecret: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const relayUrl = Deno.env.get("MAIL_RELAY_URL");
  const relaySecret = Deno.env.get("MAIL_RELAY_SECRET");

  if (!relayUrl || !relaySecret) return null;

  const from =
    Deno.env.get("SMTP_FROM") ||
    Deno.env.get("SMTP_USER") ||
    "notify@classicvisions.net";

  return { relayUrl, relaySecret, from };
}

export async function sendViaSMTP(
  opts: SmtpMailOptions,
  config: SmtpConfig,
): Promise<void> {
  const resp = await fetch(config.relayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Relay-Secret": config.relaySecret,
    },
    body: JSON.stringify({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo ?? "",
      from: opts.from ?? config.from,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Mail relay error ${resp.status}: ${text}`);
  }

  const result = await resp.json();
  if (!result.ok) {
    throw new Error(`Mail relay rejected send: ${JSON.stringify(result)}`);
  }
}
