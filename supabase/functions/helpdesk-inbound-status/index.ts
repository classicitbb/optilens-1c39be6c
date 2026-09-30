import { createCorsPolicy, getCorsHeaders, handleCorsPreflight } from '../_shared/http/cors.ts'
import { requirePrivilegedAccess } from '../_shared/http/auth.ts'

/**
 * helpdesk-inbound-status edge function
 *
 * Admin-only health view of the inbound support mailbox:
 *   { action: 'status' }   -> webhook URL, whether the shared secret is set, recent inbound activity
 *   { action: 'selftest' } -> posts a synthetic email to helpdesk-inbound-email, confirms a ticket
 *                             was created, then deletes the test ticket
 *
 * Never returns the secret itself.
 */

const corsPolicy = createCorsPolicy({
  allowHeaders: 'authorization, x-client-info, apikey, content-type',
  allowMethods: 'POST, OPTIONS',
})

const SELFTEST_DOMAIN = 'selftest.invalid'

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy)
  if (preflight) return preflight
  const corsHeaders = getCorsHeaders(req, corsPolicy)

  const auth = await requirePrivilegedAccess(req, corsHeaders, {
    allowedRoles: ['admin', 'operator'],
    sourceFunction: 'helpdesk-inbound-status',
  })
  if (auth instanceof Response) return auth
  const db = auth.supabaseAdminClient

  let action = 'status'
  try {
    action = (await req.json())?.action ?? 'status'
  } catch { /* default to status */ }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const webhookUrl = `${supabaseUrl}/functions/v1/helpdesk-inbound-email`
  const secret = (Deno.env.get('HELPDESK_INBOUND_SECRET') ?? '').trim()

  if (action === 'status') {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString()
    const [{ data: last }, { count }] = await Promise.all([
      db.from('helpdesk_inbound_email_log')
        .select('created_at,from_address,subject,mailbox')
        .not('from_address', 'ilike', `%@${SELFTEST_DOMAIN}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('helpdesk_inbound_email_log')
        .select('id', { count: 'exact', head: true })
        .not('from_address', 'ilike', `%@${SELFTEST_DOMAIN}`)
        .gte('created_at', since),
    ])
    return json({
      webhookUrl,
      secretConfigured: secret.length > 0,
      mailbox: last?.mailbox ?? 'support@classicvisions.net',
      lastReceivedAt: last?.created_at ?? null,
      lastFrom: last?.from_address ?? null,
      lastSubject: last?.subject ?? null,
      received30d: count ?? 0,
    }, 200, corsHeaders)
  }

  if (action === 'selftest') {
    if (!secret) return json({ ok: false, step: 'secret', message: 'HELPDESK_INBOUND_SECRET is not set on the server.' }, 200, corsHeaders)

    const messageId = `selftest-${crypto.randomUUID()}`
    let res: Response
    try {
      res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-inbound-secret': secret },
        body: JSON.stringify({
          from: `Inbound self-test <check@${SELFTEST_DOMAIN}>`,
          to: 'support@classicvisions.net',
          subject: 'Inbound email self-test',
          body_text: 'Synthetic message from Email Previews. Safe to ignore; it is deleted automatically.',
          message_id: messageId,
        }),
      })
    } catch (err) {
      return json({ ok: false, step: 'request', message: `Webhook unreachable: ${String(err)}` }, 200, corsHeaders)
    }
    const result = await res.json().catch(() => ({}))
    if (!res.ok || !result.ticketId) {
      return json({ ok: false, step: 'webhook', message: `Webhook returned ${res.status}: ${result.error ?? 'no ticket created'}` }, 200, corsHeaders)
    }

    // Remove the synthetic ticket and its trail.
    await db.from('helpdesk_ticket_events').delete().eq('ticket_id', result.ticketId)
    await db.from('helpdesk_inbound_email_log').delete().eq('ticket_id', result.ticketId)
    const { error: delErr } = await db.from('helpdesk_tickets').delete().eq('id', result.ticketId)

    return json({
      ok: true,
      message: delErr
        ? `Webhook and secret work (created ${result.ticketNumber}), but the test ticket could not be deleted: ${delErr.message}`
        : `Webhook and secret work: created and removed test ticket ${result.ticketNumber}.`,
    }, 200, corsHeaders)
  }

  return json({ error: `Unknown action: ${action}` }, 400, corsHeaders)
})
