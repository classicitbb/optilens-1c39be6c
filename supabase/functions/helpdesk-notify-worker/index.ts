import { createClient } from 'npm:@supabase/supabase-js@2'
import { getSmtpConfig, isAutoNotificationsDisabled, sendViaSMTP } from '../_shared/email/smtp.ts'
import { accountOpenTicketsEmail } from '../_shared/email/helpdeskTemplates.ts'

/**
 * helpdesk-notify-worker edge function
 *
 * Drains helpdesk_notification_queue: when a contact or portal user joins an
 * account that has open account-wide tickets, tell them once that tickets are
 * waiting (count only, no titles). Scheduled every 15 minutes by the
 * 20260929160000_helpdesk_account_audience migration.
 *
 * Auth: X-Scheduler-Secret header matching HELPDESK_SCHEDULER_SECRET.
 */

const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://classicvisions.net'
const MAX_ATTEMPTS = 5

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const schedulerSecret = Deno.env.get('HELPDESK_SCHEDULER_SECRET')
  if (!schedulerSecret || req.headers.get('x-scheduler-secret') !== schedulerSecret) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const smtpConfig = getSmtpConfig()
  if (!smtpConfig) return json({ error: 'SMTP not configured; queue left pending' }, 503)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const results = { sent: 0, skipped: 0, failed: 0 }

  const { data: rows, error } = await db
    .from('helpdesk_notification_queue')
    .select('id,account_contact_id,recipient_email,recipient_name,attempts')
    .is('sent_at', null)
    .is('skipped_reason', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) return json({ error: error.message }, 500)

  for (const row of rows ?? []) {
    const { count } = await db
      .from('helpdesk_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('partner_contact_id', row.account_contact_id)
      .is('closed_at', null)

    let skippedReason: string | null = null
    if (!count) skippedReason = 'no_open_tickets'
    else if (await isAutoNotificationsDisabled(db, row.recipient_email)) skippedReason = 'auto_notifications_disabled'

    if (skippedReason) {
      await db.from('helpdesk_notification_queue').update({ skipped_reason: skippedReason }).eq('id', row.id)
      results.skipped++
      continue
    }

    const { data: account } = await db
      .from('contacts')
      .select('name,business_name')
      .eq('id', row.account_contact_id)
      .maybeSingle()

    const email = accountOpenTicketsEmail({
      openCount: count ?? 0,
      recipientName: row.recipient_name,
      accountName: account?.business_name?.trim() || account?.name || null,
      viewUrl: `${APP_BASE_URL}/profile/helpdesk`,
    })

    try {
      await sendViaSMTP({ to: row.recipient_email, subject: email.subject, html: email.html }, smtpConfig)
      await db.from('helpdesk_notification_queue').update({ sent_at: new Date().toISOString(), last_error: null }).eq('id', row.id)
      results.sent++
    } catch (err) {
      await db
        .from('helpdesk_notification_queue')
        .update({ attempts: row.attempts + 1, last_error: String(err).slice(0, 500) })
        .eq('id', row.id)
      results.failed++
    }
  }

  return json({ ok: true, ...results })
})
