import { createTransport } from "npm:nodemailer@6.10.1";

export interface SmtpSendOptions {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  messageId?: string;
}

/**
 * Sends an email via the configured SMTP server.
 *
 * Required Supabase secrets:
 *   SMTP_HOST     - e.g. mail.classicvisions.net
 *   SMTP_USER     - e.g. notify@classicvisions.net
 *   SMTP_PASSWORD - account password
 *
 * Optional secrets:
 *   SMTP_PORT          - defaults to 465 (SSL/TLS)
 *   SMTP_FROM_OVERRIDE - if set, replaces the email address in the From header
 *                        while keeping the display name. Use this when the SMTP
 *                        server restricts sending to the authenticated address only.
 */
export async function sendSmtpEmail(options: SmtpSendOptions): Promise<void> {
  const host = Deno.env.get("SMTP_HOST");
  const port = parseInt(Deno.env.get("SMTP_PORT") ?? "465", 10);
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASSWORD");

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP not configured: set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD as Supabase secrets"
    );
  }

  const fromOverride = Deno.env.get("SMTP_FROM_OVERRIDE");
  const resolvedFrom = fromOverride
    ? options.from.replace(/<[^>]+>/, `<${fromOverride}>`)
    : options.from;

  const transporter = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  await transporter.sendMail({
    from: resolvedFrom,
    to: options.to,
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    subject: options.subject,
    html: options.html,
    ...(options.text ? { text: options.text } : {}),
    ...(options.messageId ? { messageId: `<${options.messageId}@classicvisions.net>` } : {}),
  });
}

/** Returns true for SMTP errors that should not be retried (permanent failures). */
export function isSmtpPermanentFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("535") ||  // auth credentials rejected
    msg.includes("550") ||  // mailbox unavailable / rejected
    msg.includes("551") ||  // user not local
    msg.includes("553") ||  // mailbox name invalid
    msg.includes("authentication") ||
    msg.includes("invalid login") ||
    msg.includes("invalid credentials")
  );
}

/** Returns true for transient SMTP errors worth retrying. */
export function isSmtpTransientFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("421") ||  // service temporarily unavailable
    msg.includes("450") ||  // requested action not taken (try again)
    msg.includes("451") ||  // local error in processing
    msg.includes("452") ||  // insufficient system storage
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound")
  );
}
