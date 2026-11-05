/**
 * crm-cadence-runner
 *
 * Server-side timing for CRM cadences. Content stays supervised:
 *   1. Due cadence steps are turned into work: email/WhatsApp steps become AI
 *      drafts in outreach_outbox (status 'draft', a person must approve);
 *      call/visit steps become planned activities.
 *   2. Drafts a person approved with "Approve & send" (auto_send = true) are
 *      sent here, inside Barbados business hours, through sendManagedEmail,
 *      with an unsubscribe link and an opt-out check.
 *
 * Auth: x-scheduler-secret = CRM_CADENCE_SCHEDULER_SECRET (pg_cron), or a
 * signed-in admin/operator (the outbox "Generate Due Outreach" button).
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRM_CADENCE_SCHEDULER_SECRET,
 *      CRM_UNSUBSCRIBE_SECRET, LOVABLE_API_KEY (via sendManagedEmail).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/http/cors.ts'
import { requirePrivilegedAccess } from '../_shared/http/auth.ts'
import { sendManagedEmail, DEFAULT_FROM } from '../_shared/email/managed-send.ts'
import {
  emailBlockReason,
  isWithinSendWindow,
  nextDueAt,
  primaryEmail,
  renderOutreachEmail,
  signUnsubscribeToken,
} from '../_shared/crm/cadenceRules.ts'

const corsPolicy = createCorsPolicy({
  allowHeaders: 'authorization, x-admin-auth-token, x-scheduler-secret, x-client-info, apikey, content-type',
  allowMethods: 'POST, OPTIONS',
})

const MAX_ENROLLMENTS_PER_RUN = 25
const MAX_SENDS_PER_RUN = 25
const CLAIM_TIMEOUT_MS = 15 * 60_000
const MAX_SEND_ATTEMPTS = 3

// deno-lint-ignore no-explicit-any
type Db = any

interface Summary {
  stepsPrepared: number
  enrollmentsExited: number
  stepErrors: number
  emailsSent: number
  emailsSkipped: number
  emailErrors: number
  sendWindowOpen: boolean
}

async function prepareDueSteps(db: Db, supabaseUrl: string, serviceKey: string, schedulerSecret: string, summary: Summary) {
  const nowIso = new Date().toISOString()
  const { data: due, error } = await db
    .from('cadence_enrollments')
    .select('id,contact_id,cadence_id,current_step,enrolled_at')
    .eq('status', 'active')
    .not('next_step_due_at', 'is', null)
    .lte('next_step_due_at', nowIso)
    .order('next_step_due_at', { ascending: true })
    .limit(MAX_ENROLLMENTS_PER_RUN)
  if (error) throw error

  for (const e of due ?? []) {
    const { data: steps } = await db
      .from('cadence_steps')
      .select('id,step_order,channel,delay_days')
      .eq('cadence_id', e.cadence_id)
      .order('step_order')
    const step = steps?.[e.current_step]
    const following = steps?.[e.current_step + 1]

    // Claim by advancing the step only if nobody else already did. A concurrent
    // run (or a second click) loses the race and skips this enrolment.
    const { data: claimed } = await db
      .from('cadence_enrollments')
      .update({
        current_step: e.current_step + 1,
        next_step_due_at: step && following ? nextDueAt(e.enrolled_at, following.delay_days) : null,
        status: step && following ? 'active' : 'completed',
        completed_at: step && following ? null : nowIso,
        last_run_at: nowIso,
        last_error: null,
      })
      .eq('id', e.id)
      .eq('status', 'active')
      .eq('current_step', e.current_step)
      .select('id')
      .maybeSingle()
    if (!claimed || !step) continue

    const { data: contact } = await db
      .from('contacts')
      .select('id,email,phone,marketing_opt_out_at,is_archived')
      .eq('id', e.contact_id)
      .maybeSingle()

    const revert = async (message: string) => {
      summary.stepErrors++
      await db
        .from('cadence_enrollments')
        .update({
          current_step: e.current_step,
          next_step_due_at: nowIso,
          status: 'active',
          completed_at: null,
          last_error: message.slice(0, 500),
        })
        .eq('id', e.id)
    }

    if (!contact) {
      await db.from('cadence_enrollments').update({ status: 'exited', next_step_due_at: null, last_error: 'contact_missing' }).eq('id', e.id)
      summary.enrollmentsExited++
      continue
    }

    if (step.channel === 'email' || step.channel === 'whatsapp') {
      const block = emailBlockReason({
        optedOutAt: contact.marketing_opt_out_at,
        archived: contact.is_archived,
        email: step.channel === 'email' ? primaryEmail(contact.email) : 'n/a',
      })
      if (block === 'opted_out' || block === 'archived') {
        await db.from('cadence_enrollments').update({ status: 'exited', next_step_due_at: null, last_error: block }).eq('id', e.id)
        summary.enrollmentsExited++
        continue
      }
      if (block) {
        // Nothing to send to (no valid email): note it and move on to the next step.
        await db.from('cadence_enrollments').update({ last_error: block }).eq('id', e.id)
        continue
      }
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/crm-draft-outreach`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            'x-scheduler-secret': schedulerSecret,
          },
          body: JSON.stringify({ contact_id: contact.id, step_id: step.id, enrollment_id: e.id }),
        })
        if (!res.ok) {
          await revert(`draft_failed_${res.status}`)
          continue
        }
        summary.stepsPrepared++
      } catch (err) {
        await revert(err instanceof Error ? err.message : 'draft_failed')
      }
    } else {
      const { error: actErr } = await db.from('activities').insert({
        activity_type: `${step.channel === 'call' ? 'Call' : 'Visit'} — cadence step ${step.step_order}`,
        contact_id: contact.id,
        status: 'planned',
        due_at: nowIso,
        type: step.channel === 'call' ? 'call' : 'meeting',
        content: `Cadence enrollment ${e.id}, channel: ${step.channel}.`,
      })
      if (actErr) await revert(actErr.message)
      else summary.stepsPrepared++
    }
  }
}

async function sendApprovedEmails(db: Db, supabaseUrl: string, unsubscribeSecret: string, summary: Summary) {
  const nowMs = Date.now()
  summary.sendWindowOpen = isWithinSendWindow(new Date(nowMs))
  if (!summary.sendWindowOpen) return

  const staleBefore = new Date(nowMs - CLAIM_TIMEOUT_MS).toISOString()
  const { data: queue, error } = await db
    .from('outreach_outbox')
    .select('id,contact_id,subject,body,send_attempts')
    .eq('status', 'approved')
    .eq('auto_send', true)
    .eq('channel', 'email')
    .is('sent_at', null)
    .lt('send_attempts', MAX_SEND_ATTEMPTS)
    .or(`claimed_at.is.null,claimed_at.lt.${staleBefore}`)
    .order('created_at', { ascending: true })
    .limit(MAX_SENDS_PER_RUN)
  if (error) throw error

  for (const row of queue ?? []) {
    const { data: claimed } = await db
      .from('outreach_outbox')
      .update({ claimed_at: new Date().toISOString(), send_attempts: row.send_attempts + 1 })
      .eq('id', row.id)
      .eq('status', 'approved')
      .is('sent_at', null)
      .or(`claimed_at.is.null,claimed_at.lt.${staleBefore}`)
      .select('id')
      .maybeSingle()
    if (!claimed) continue

    const { data: contact } = await db
      .from('contacts')
      .select('id,email,marketing_opt_out_at,is_archived')
      .eq('id', row.contact_id)
      .maybeSingle()
    const to = primaryEmail(contact?.email)
    const block = emailBlockReason({
      optedOutAt: contact?.marketing_opt_out_at,
      archived: contact?.is_archived ?? true,
      email: to,
    })
    if (block || !to) {
      await db.from('outreach_outbox').update({ status: 'rejected', error: `blocked:${block}`, claimed_at: null }).eq('id', row.id)
      summary.emailsSkipped++
      continue
    }

    const token = await signUnsubscribeToken(contact.id, unsubscribeSecret)
    const { html, text } = renderOutreachEmail(
      row.body ?? '',
      `${supabaseUrl}/functions/v1/crm-unsubscribe?t=${encodeURIComponent(token)}`,
    )
    const result = await sendManagedEmail(db, {
      messageId: `crm-outreach-${row.id}`,
      to,
      from: DEFAULT_FROM,
      subject: row.subject || 'Classic Visions',
      html,
      text,
      label: 'crm-outreach',
      idempotencyKey: `crm-outreach-${row.id}`,
      logMetadata: { outbox_id: row.id, contact_id: contact.id },
    })

    if (result.status === 'sent') {
      await db.from('outreach_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), error: null }).eq('id', row.id)
      summary.emailsSent++
    } else if (result.status === 'suppressed') {
      await db.from('outreach_outbox').update({ status: 'rejected', error: 'blocked:suppressed', claimed_at: null }).eq('id', row.id)
      summary.emailsSkipped++
    } else {
      const exhausted = row.send_attempts + 1 >= MAX_SEND_ATTEMPTS
      await db
        .from('outreach_outbox')
        .update({ status: exhausted ? 'failed' : 'approved', error: result.error.slice(0, 500), claimed_at: null })
        .eq('id', row.id)
      summary.emailErrors++
    }
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy)
  if (preflight) return preflight
  const corsHeaders = getCorsHeaders(req, corsPolicy)
  const blocked = rejectDisallowedOrigin(req, corsPolicy)
  if (blocked) return blocked
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const schedulerSecret = Deno.env.get('CRM_CADENCE_SCHEDULER_SECRET') ?? ''
  const unsubscribeSecret = Deno.env.get('CRM_UNSUBSCRIBE_SECRET') ?? ''
  if (!supabaseUrl || !serviceKey) return reply(500, { error: 'Supabase environment is not configured' })

  const provided = req.headers.get('x-scheduler-secret')
  if (provided) {
    if (!schedulerSecret || provided !== schedulerSecret) return reply(401, { error: 'Unauthorized' })
  } else {
    const auth = await requirePrivilegedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'operator'],
      sourceFunction: 'crm-cadence-runner',
    })
    if (auth instanceof Response) return auth
  }

  // Without these the runner would either draft with no way to authenticate or
  // send mail with no unsubscribe link; refuse rather than degrade silently.
  if (!schedulerSecret || !unsubscribeSecret) {
    return reply(503, { error: 'CRM_CADENCE_SCHEDULER_SECRET and CRM_UNSUBSCRIBE_SECRET must both be configured' })
  }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const summary: Summary = {
    stepsPrepared: 0,
    enrollmentsExited: 0,
    stepErrors: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailErrors: 0,
    sendWindowOpen: false,
  }

  try {
    await prepareDueSteps(db, supabaseUrl, serviceKey, schedulerSecret, summary)
    await sendApprovedEmails(db, supabaseUrl, unsubscribeSecret, summary)
    return reply(200, { success: true, ...summary })
  } catch (err) {
    console.error('crm-cadence-runner failed', err instanceof Error ? err.message : err)
    return reply(500, { error: err instanceof Error ? err.message : 'Runner failed', ...summary })
  }
})
