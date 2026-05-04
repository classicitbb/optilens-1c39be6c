/**
 * Shared SMTP email sender using nodemailer.
 *
 * Reads connection details from env vars set as Supabase project secrets:
 *   SMTP_HOST  — mail server hostname, e.g. mail.classicvisions.net
 *   SMTP_PORT  — 587 (STARTTLS, default) or 465 (SSL)
 *   SMTP_USER  — full email address used to authenticate, e.g. noreply@classicvisions.net
 *   SMTP_PASS  — password for that account
 *   SMTP_FROM  — optional display From address; falls back to SMTP_USER
 */

import nodemailer from "npm:nodemailer@6.9.14";

export interface SmtpMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string; // override the default SMTP_FROM / SMTP_USER
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");

  if (!host || !user || !pass) return null;

  const port = parseInt(Deno.env.get("SMTP_PORT") ?? "587", 10);
  const from = Deno.env.get("SMTP_FROM") || user;

  return { host, port, user, pass, from };
}

export async function sendViaSMTP(
  opts: SmtpMailOptions,
  config: SmtpConfig,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // port 465 = implicit SSL; anything else = STARTTLS
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    // Reasonable timeouts for edge function execution limits
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  });

  await transporter.sendMail({
    from: opts.from ?? config.from,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
