// Managed email transport.
//
// Every outbound app email goes through Lovable's managed email API. Delivery,
// retries, rate limits, suppression and the unsubscribe footer are handled by
// Lovable — this module only renders-agnostic transport plus the project's own
// `email_send_log` audit trail (kept for the admin Email Audit surfaces).

import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0'

// Configuration baked in at email setup time — do NOT change these manually.
export const SITE_NAME = 'Classic Visions'
/** Verified sender subdomain delegated to Lovable. */
export const SENDER_DOMAIN = 'support.classicvisions.net'
/** Domain shown in the From: header. */
export const FROM_DOMAIN = 'classicvisions.net'
export const DEFAULT_FROM = `${SITE_NAME} <noreply@${FROM_DOMAIN}>`

export interface ManagedSendInput {
  /** Stable id used for the audit trail and (by default) idempotency. */
  messageId: string
  to: string
  subject: string
  html: string
  text?: string
  /** Template/label name recorded in `email_send_log.template_name`. */
  label: string
  idempotencyKey?: string
  from?: string
  replyTo?: string
  // deno-lint-ignore no-explicit-any
  attachments?: any[]
  logMetadata?: Record<string, unknown>
}

export type ManagedSendResult =
  | { status: 'sent' }
  | { status: 'suppressed'; error: string }
  | { status: 'failed'; error: string }

// deno-lint-ignore no-explicit-any
type AdminClient = { from: (table: string) => any }

/** Plain-text fallback for emails that only supply HTML. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n\n')
    .trim()
  // Image-only messages still need a non-whitespace plain-text part.
  return text || 'Please view the HTML version of this message.'
}

async function logSend(
  admin: AdminClient,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin.from('email_send_log').insert(row)
  if (error) {
    console.error('email_send_log write failed', {
      status: row.status,
      error: (error as { code?: string; message?: string }).message,
    })
  }
}

/**
 * Send one email to one recipient through Lovable's managed email API and
 * record the outcome in `email_send_log`.
 *
 * A suppressed recipient is an expected outcome, not an error — it resolves
 * with `{ status: 'suppressed' }` and never throws.
 */
export async function sendManagedEmail(
  admin: AdminClient,
  input: ManagedSendInput,
): Promise<ManagedSendResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    const error = 'LOVABLE_API_KEY is not configured'
    console.error('sendManagedEmail: ' + error, { label: input.label })
    await logSend(admin, {
      message_id: input.messageId,
      template_name: input.label,
      recipient_email: input.to,
      status: 'failed',
      error_message: error,
      ...(input.logMetadata ? { metadata: input.logMetadata } : {}),
    })
    return { status: 'failed', error }
  }

  try {
    await sendLovableEmail(
      {
        to: input.to,
        from: input.from ?? DEFAULT_FROM,
        sender_domain: SENDER_DOMAIN,
        subject: input.subject,
        html: input.html,
        // The API rejects an empty `text` part — derive one from the HTML.
        text: input.text?.trim() ? input.text : htmlToText(input.html),
        purpose: 'transactional',
        label: input.label,
        idempotency_key: input.idempotencyKey ?? input.messageId,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        // The library's request type doesn't declare attachments yet, but the
        // API accepts and forwards them.
        ...(input.attachments ? { attachments: input.attachments } : {}),
      } as Parameters<typeof sendLovableEmail>[0],
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await logSend(admin, {
        message_id: input.messageId,
        template_name: input.label,
        recipient_email: input.to,
        status: 'suppressed',
        error_message: 'Recipient suppressed',
        ...(input.logMetadata ? { metadata: input.logMetadata } : {}),
      })
      return { status: 'suppressed', error: 'recipient_suppressed' }
    }

    console.error('Managed email send failed', { label: input.label, error: message })
    await logSend(admin, {
      message_id: input.messageId,
      template_name: input.label,
      recipient_email: input.to,
      status: 'failed',
      error_message: message.slice(0, 1000),
      ...(input.logMetadata ? { metadata: input.logMetadata } : {}),
    })
    return { status: 'failed', error: message }
  }

  await logSend(admin, {
    message_id: input.messageId,
    template_name: input.label,
    recipient_email: input.to,
    status: 'sent',
    ...(input.logMetadata ? { metadata: input.logMetadata } : {}),
  })
  return { status: 'sent' }
}
