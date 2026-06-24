import { createClient } from 'npm:@supabase/supabase-js@2'
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight } from '../_shared/http/cors.ts'
import { getSmtpConfig, sendViaSMTP } from '../_shared/email/smtp.ts'

/**
 * helpdesk-email edge function
 *
 * Handles transactional emails for the helpdesk system:
 * - ticket_created: sends acknowledgment to customer with View/Close buttons
 * - staff_reply: sends reply notification to customer
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
const SITE_NAME = 'Classic Visions'

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

function ticketCreatedHtml(opts: {
  ticketNumber: string
  subject: string
  customerName: string
  viewUrl: string
  closeUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="color:#111827;margin-top:0">${SITE_NAME} Support</h2>
    <p style="color:#374151">Hi ${opts.customerName},</p>
    <p style="color:#374151">We've received your support ticket <strong>${opts.ticketNumber}</strong>: <em>${opts.subject}</em>.</p>
    <p style="color:#374151">Our team will respond within <strong>1 business day</strong>. You can track progress or close the ticket using the links below.</p>
    <div style="margin:28px 0;display:flex;gap:12px;flex-wrap:wrap">
      <a href="${opts.viewUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">View Ticket</a>
      <a href="${opts.closeUrl}" style="display:inline-block;padding:10px 20px;background:#f3f4f6;color:#374151;text-decoration:none;border-radius:6px;font-size:14px;border:1px solid #d1d5db">Close Ticket (resolved)</a>
    </div>
    <p style="color:#6b7280;font-size:13px">If you did not submit a support ticket, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">${SITE_NAME} · This is an automated message, please do not reply directly to this email.</p>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function staffReplyHtml(opts: {
  ticketNumber: string
  subject: string
  replyBody: string
  viewUrl: string
}): string {
  const bodyHtml = escapeHtml(opts.replyBody).replace(/\n/g, '<br>')
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:32px">
    <h2 style="color:#111827;margin-top:0">${SITE_NAME} Support</h2>
    <p style="color:#374151">New reply on your ticket <strong>${opts.ticketNumber}</strong>: <em>${opts.subject}</em></p>
    <div style="background:#f9fafb;border-left:3px solid #111827;padding:16px;margin:20px 0;border-radius:4px;color:#374151;font-size:14px;line-height:1.6">${bodyHtml}</div>
    <a href="${opts.viewUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">View Full Thread</a>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">${SITE_NAME} · Reply to this email to respond to the ticket.</p>
  </div>
</body>
</html>`
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

  if (!isSchedulerCall) {
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
    .select('id,ticket_number,title,customer_email,contact_token,owner_user_id,first_response_at')
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    return jsonResponse({ error: 'Ticket not found' }, 404, corsHeaders)
  }

  const viewUrl = `${APP_BASE_URL}/account/support?ticket=${ticket.contact_token}`
  const closeUrl = `${APP_BASE_URL}/api/helpdesk/close?token=${ticket.contact_token}`

  try {
    if (type === 'ticket_created') {
      if (!ticket.customer_email) {
        return jsonResponse({ ok: true, skipped: 'no_customer_email' }, 200, corsHeaders)
      }

      // Fetch contact name if available
      const { data: contact } = await db
        .from('contacts')
        .select('first_name,last_name,email')
        .eq('email', ticket.customer_email)
        .maybeSingle()

      const customerName =
        contact
          ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'there'
          : 'there'

      await sendEmail({
        to: ticket.customer_email,
        subject: `[${ticket.ticket_number}] We received your support request`,
        html: ticketCreatedHtml({
          ticketNumber: ticket.ticket_number,
          subject: ticket.title,
          customerName,
          viewUrl,
          closeUrl,
        }),
      })

      // Log outbound event
      await db.from('helpdesk_ticket_events').insert({
        ticket_id: ticketId,
        event_type: 'acknowledgment_sent',
        payload: { to: ticket.customer_email },
      })

    } else if (type === 'staff_reply') {
      if (!ticket.customer_email || !messageBody) {
        return jsonResponse({ error: 'Missing customer_email or messageBody' }, 400, corsHeaders)
      }

      await sendEmail({
        to: ticket.customer_email,
        subject: `Re: [${ticket.ticket_number}] ${ticket.title}`,
        html: staffReplyHtml({
          ticketNumber: ticket.ticket_number,
          subject: ticket.title,
          replyBody: messageBody,
          viewUrl,
        }),
      })

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

      // Also notify customer
      if (ticket.customer_email) {
        await sendEmail({
          to: ticket.customer_email,
          subject: `Update on your ticket [${ticket.ticket_number}]`,
          html: staffReplyHtml({
            ticketNumber: ticket.ticket_number,
            subject: ticket.title,
            replyBody: "We apologize for the delay in responding to your ticket. Our team is reviewing your request and will get back to you shortly.",
            viewUrl,
          }),
        })
      }

    } else {
      return jsonResponse({ error: `Unknown type: ${type}` }, 400, corsHeaders)
    }

    return jsonResponse({ ok: true }, 200, corsHeaders)
  } catch (err) {
    console.error('[helpdesk-email] Error:', err)
    return jsonResponse({ error: String(err) }, 500, corsHeaders)
  }
})
