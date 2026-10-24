import { createClient } from 'npm:@supabase/supabase-js@2'
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight } from '../_shared/http/cors.ts'
import { getSmtpConfig, isAutoNotificationsDisabled, sendViaSMTP } from '../_shared/email/smtp.ts'
import { HELPDESK_SITE_NAME, ticketCreatedEmail, ticketMessageEmail } from '../_shared/email/helpdeskTemplates.ts'

/**
 * helpdesk-email edge function
 *
 * Handles transactional emails for the helpdesk system:
 * - ticket_created: notifies the ticket's audience (see helpdesk_ticket_recipients)
 * - staff_reply: tells the audience there is a new message (no reply text)
 * - followup_breach: sends SLA breach nudge to assignee and/or customer
 *
 * Called with:
 *   POST /functions/v1/helpdesk-email
 *   Body: { type: string; ticketId: string; messageBody?: string }
 *
 * Auth: admin or service-role (for scheduled follow-ups).
 */

const corsPolicy = createCorsPolicy({
  allowHeaders: 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
  allowMethods: 'POST, OPTIONS',
})

const SENDER_DOMAIN = Deno.env.get('HELPDESK_SENDER_DOMAIN') ?? Deno.env.get('HELPDESK_FROM_ADDRESS') ?? 'support@classicvisions.net'
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://classicvisions.net'
const SITE_NAME = HELPDESK_SITE_NAME

function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<void> {
  const smtpConfig = getSmtpConfig()

  if (smtpConfig) {
    await sendViaSMTP(
      { to: opts.to, subject: opts.subject, html: opts.html, replyTo: opts.replyTo },
      smtpConfig,
    )
    return
  }

  // No SMTP configured — log so the issue is visible in edge function logs
  console.warn(`[helpdesk-email] SMTP not configured — would send to ${opts.to}: ${opts.subject}`)
}

function followupBreachHtml(opts: {
  ticketNumber: string
  subject: string
  followupType: string
  viewUrl: string
}): string {
  const label = opts.followupType === 'first_response_breach' ? 'First Response SLA Breached' : 'Resolution SLA Breached'
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="color:#dc2626;margin-top:0">⚠ ${label}</h2>
    <p style="color:#374151">Ticket <strong>${opts.ticketNumber}</strong> — <em>${opts.subject}</em> — has exceeded its SLA deadline and requires immediate attention.</p>
    <a href="${opts.viewUrl}" style="display:inline-block;padding:10px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">Open Ticket</a>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">${SITE_NAME} Helpdesk — automated SLA alert</p>
  </div>
</body>
</html>`
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req, corsPolicy)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  // Auth: accept either a valid admin user session OR the scheduler secret
  const authHeader = req.headers.get('authorization') ?? ''
  const schedulerSecret = Deno.env.get('HELPDESK_SCHEDULER_SECRET')
  const providedSecret = req.headers.get('x-scheduler-secret')

  const isSchedulerCall = schedulerSecret && providedSecret === schedulerSecret
  // helpdesk-inbound-email calls with the service-role key as its bearer.
  const isServiceCall = authHeader === `Bearer ${serviceKey}`

  if (!isSchedulerCall && !isServiceCall) {
    // Verify it's an authenticated admin user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await db.auth.getUser(token)
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders)
    }
    // Check admin role
    const { data: roleRow } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'operator'])
      .maybeSingle()
    if (!roleRow) {
      return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders)
    }
  }

  let body: { type: string; ticketId: string; messageBody?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders)
  }

  const { type, ticketId, messageBody } = body
  if (!type || !ticketId) {
    return jsonResponse({ error: 'Missing type or ticketId' }, 400, corsHeaders)
  }

  // Fetch ticket data
  const { data: ticket, error: ticketError } = await db
    .from('helpdesk_tickets')
    .select('id,ticket_number,title,customer_email,owner_user_id,first_response_at')
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    return jsonResponse({ error: 'Ticket not found' }, 404, corsHeaders)
  }

  // Audience: a person contact gets it alone; a company contact means every
  // contact and portal user of that account. Inbound-email senders are kept.
  const { data: audienceRows, error: audienceError } = await db.rpc('helpdesk_ticket_recipients', { p_ticket_id: ticketId })
  if (audienceError) {
    return jsonResponse({ error: audienceError.message }, 500, corsHeaders)
  }
  const recipients = new Map<string, { email: string; name: string | null; accountName: string | null }>()
  for (const row of (audienceRows ?? []) as Array<{ email: string; name: string | null; account_name: string | null }>) {
    recipients.set(row.email.toLowerCase(), { email: row.email, name: row.name, accountName: row.account_name })
  }
  const accountName = [...recipients.values()][0]?.accountName ?? null
  if (ticket.customer_email && !recipients.has(ticket.customer_email.toLowerCase())) {
    recipients.set(ticket.customer_email.toLowerCase(), { email: ticket.customer_email, name: null, accountName })
  }

  const viewUrl = `${APP_BASE_URL}/profile/helpdesk/${ticket.id}`

  const sendToAudience = async (build: (r: { name: string | null; accountName: string | null }) => { subject: string; html: string }, eventType: string) => {
    const sent: string[] = []
    for (const recipient of recipients.values()) {
      if (await isAutoNotificationsDisabled(db, recipient.email)) continue
      const email = build(recipient)
      await sendEmail({ to: recipient.email, subject: email.subject, html: email.html })
      sent.push(recipient.email)
    }
    if (sent.length) {
      await db.from('helpdesk_ticket_events').insert({ ticket_id: ticketId, event_type: eventType, payload: { to: sent } })
    }
    return sent
  }

  try {
    if (type === 'ticket_created') {
      const sent = await sendToAudience((r) => ticketCreatedEmail({
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        recipientName: r.name,
        accountName: r.accountName,
        viewUrl,
      }), 'acknowledgment_sent')
      if (!sent.length) return jsonResponse({ ok: true, skipped: 'no_recipients' }, 200, corsHeaders)

    } else if (type === 'staff_reply') {
      // The reply text stays in the portal; the email only says there is one.
      if (!messageBody) {
        return jsonResponse({ error: 'Missing messageBody' }, 400, corsHeaders)
      }
      await sendToAudience((r) => ticketMessageEmail({
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        recipientName: r.name,
        accountName: r.accountName,
        viewUrl,
      }), 'reply_notification_sent')

      // Set first_response_at if not yet set
      if (!ticket.first_response_at) {
        await db
          .from('helpdesk_tickets')
          .update({ first_response_at: new Date().toISOString() })
          .eq('id', ticketId)
      }

    } else if (type === 'followup_breach') {
      const followupType = (body as Record<string, string>).followupType ?? 'resolution_breach'

      // Get assignee email if owner_user_id exists
      if (ticket.owner_user_id) {
        const { data: { user: assignee } } = await db.auth.admin.getUserById(ticket.owner_user_id)
        const assigneeEmail = assignee?.email
        if (assigneeEmail) {
          await sendEmail({
            to: assigneeEmail,
            subject: `[SLA Alert] ${ticket.ticket_number}: ${ticket.title}`,
            html: followupBreachHtml({
              ticketNumber: ticket.ticket_number,
              subject: ticket.title,
              followupType,
              viewUrl: `${APP_BASE_URL}/admin/helpdesk/tickets/${ticket.id}`,
            }),
          })
        }
      }

      // Also notify the ticket's audience (no detail in the body)
      await sendToAudience((r) => ticketMessageEmail({
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        recipientName: r.name,
        accountName: r.accountName,
        viewUrl,
      }), 'followup_notification_sent')

    } else {
      return jsonResponse({ error: `Unknown type: ${type}` }, 400, corsHeaders)
    }

    return jsonResponse({ ok: true }, 200, corsHeaders)
  } catch (err) {
    console.error('[helpdesk-email] Error:', err)
    return jsonResponse({ error: String(err) }, 500, corsHeaders)
  }
})
