// Pure rules for the server-side cadence runner. No Deno or npm imports so the
// decisions can be unit-tested directly.

const SEPARATORS = /[,;:\n]+/
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

/** First valid address from a contact's normalized email list, or null. */
export function primaryEmail(value: string | null | undefined): string | null {
  for (const part of String(value ?? '').split(SEPARATORS)) {
    const email = part.trim()
    if (EMAIL_RE.test(email)) return email
  }
  return null
}

/**
 * Business hours in Barbados (UTC-4, no daylight saving): Mon-Fri 08:00-17:00.
 * Sends outside the window stay queued and go on the next run inside it.
 */
export function isWithinSendWindow(now: Date): boolean {
  const local = new Date(now.getTime() - 4 * 3_600_000)
  const day = local.getUTCDay()
  const hour = local.getUTCHours()
  return day >= 1 && day <= 5 && hour >= 8 && hour < 17
}

/** Delays are days since enrolment, matching the pipeline UI. */
export function nextDueAt(enrolledAt: string | Date, delayDays: number): string {
  return new Date(new Date(enrolledAt).getTime() + delayDays * 86_400_000).toISOString()
}

export interface SuppressionInput {
  optedOutAt: string | null | undefined
  archived?: boolean | null
  email: string | null
}

/** Why a contact must not receive a marketing/outreach email, or null if clear. */
export function emailBlockReason(input: SuppressionInput): string | null {
  if (input.optedOutAt) return 'opted_out'
  if (input.archived) return 'archived'
  if (!input.email) return 'no_valid_email'
  return null
}

const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('')

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
}

/** `<contactId>.<hmac>`; the id is a UUID so no extra encoding is needed. */
export async function signUnsubscribeToken(contactId: string, secret: string): Promise<string> {
  return `${contactId}.${await hmac(secret, `unsubscribe:${contactId}`)}`
}

/** Returns the contact id when the token is genuine, otherwise null. */
export async function verifyUnsubscribeToken(token: string, secret: string): Promise<string | null> {
  const [contactId, signature] = String(token ?? '').split('.')
  if (!contactId || !signature || !/^[0-9a-f-]{36}$/i.test(contactId)) return null
  const expected = await hmac(secret, `unsubscribe:${contactId}`)
  if (expected.length !== signature.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0 ? contactId : null
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Plain outreach body to HTML plus text, each ending with an unsubscribe line. */
export function renderOutreachEmail(body: string, unsubscribeUrl: string) {
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#222">${
    escapeHtml(body).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
  }<p style="margin-top:24px;font-size:12px;color:#777">If you would rather not hear from us, <a href="${escapeHtml(unsubscribeUrl)}">unsubscribe here</a>.</p></div>`
  const text = `${body}\n\nIf you would rather not hear from us, unsubscribe: ${unsubscribeUrl}`
  return { html, text }
}
