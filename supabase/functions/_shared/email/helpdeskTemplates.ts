/**
 * Customer-facing helpdesk email templates.
 *
 * Privacy rule: ticket titles and message text can name patients, so they may
 * appear in the SUBJECT line only. Bodies carry the ticket number, the account
 * name and a sign-in link — never the title, description or reply text.
 */

export const HELPDESK_SITE_NAME = 'Classic Visions'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface HelpdeskEmail {
  subject: string
  html: string
}

function layout(inner: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="color:#111827;margin-top:0">${HELPDESK_SITE_NAME} Support</h2>
${inner}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">${HELPDESK_SITE_NAME} · You can reply to this email to add to the ticket.</p>
  </div>
</body>
</html>`
}

function button(url: string, label: string): string {
  return `    <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">${label}</a></p>`
}

function greeting(name: string | null | undefined): string {
  return `    <p style="color:#374151">Hi ${escapeHtml(name?.trim() || 'there')},</p>`
}

const PRIVACY_LINE = `    <p style="color:#374151">For privacy, the details are only available after you sign in to your ${HELPDESK_SITE_NAME} account.</p>`

function forLine(accountName: string | null | undefined): string {
  return accountName?.trim() ? ` for <strong>${escapeHtml(accountName.trim())}</strong>` : ''
}

function reasonLine(accountName: string | null | undefined): string {
  const who = accountName?.trim() ? escapeHtml(accountName.trim()) : 'this account'
  return `    <p style="color:#6b7280;font-size:13px">You are receiving this because you are a contact for ${who}. If you believe this was sent to you in error, please let us know.</p>`
}

export function ticketCreatedEmail(opts: {
  ticketNumber: string
  title: string
  recipientName?: string | null
  accountName?: string | null
  viewUrl: string
}): HelpdeskEmail {
  return {
    subject: `[${opts.ticketNumber}] ${opts.title}`,
    html: layout(`${greeting(opts.recipientName)}
    <p style="color:#374151">${HELPDESK_SITE_NAME} has opened ticket <strong>${escapeHtml(opts.ticketNumber)}</strong>${forLine(opts.accountName)}.</p>
${PRIVACY_LINE}
${button(opts.viewUrl, 'Sign in to view ticket')}
${reasonLine(opts.accountName)}`),
  }
}

export function ticketMessageEmail(opts: {
  ticketNumber: string
  title: string
  recipientName?: string | null
  accountName?: string | null
  viewUrl: string
}): HelpdeskEmail {
  return {
    subject: `Re: [${opts.ticketNumber}] ${opts.title}`,
    html: layout(`${greeting(opts.recipientName)}
    <p style="color:#374151">There is a new message on ticket <strong>${escapeHtml(opts.ticketNumber)}</strong>${forLine(opts.accountName)}.</p>
${PRIVACY_LINE}
${button(opts.viewUrl, 'Sign in to read message')}
${reasonLine(opts.accountName)}`),
  }
}

export function accountOpenTicketsEmail(opts: {
  openCount: number
  recipientName?: string | null
  accountName?: string | null
  viewUrl: string
}): HelpdeskEmail {
  const plural = opts.openCount === 1 ? 'is 1 open ticket' : `are ${opts.openCount} open tickets`
  return {
    subject: `Open support tickets on your ${HELPDESK_SITE_NAME} account`,
    html: layout(`${greeting(opts.recipientName)}
    <p style="color:#374151">You have been added as a contact${forLine(opts.accountName)}. There ${plural} on this account.</p>
${PRIVACY_LINE}
${button(opts.viewUrl, 'Sign in to view tickets')}
${reasonLine(opts.accountName)}`),
  }
}
