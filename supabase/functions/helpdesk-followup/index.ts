import { createClient } from 'npm:@supabase/supabase-js@2'

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const asNestedRecord = (value: unknown): Record<string, unknown> | null => {
  if (Array.isArray(value)) {
    return asRecord(value[0] ?? null)
  }

  return asRecord(value)
}

/**
 * helpdesk-followup edge function
 *
 * Scheduled every 15 minutes. Scans for SLA breaches on active tickets
 * and enqueues follow-up emails via helpdesk-email, using helpdesk_followup_queue
 * as a deduplication guard.
 *
 * Auth: requires X-Scheduler-Secret header matching HELPDESK_SCHEDULER_SECRET env var.
 */

Deno.serve(async (req) => {
  // Only POST supported
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Authenticate via shared secret
  const schedulerSecret = Deno.env.get('HELPDESK_SCHEDULER_SECRET')
  const providedSecret = req.headers.get('x-scheduler-secret')

  if (!schedulerSecret || providedSecret !== schedulerSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  const results = { checked: 0, queued: 0, errors: 0 }

  try {
    // Run the existing SLA overdue job first to update statuses
    await db.rpc('helpdesk_run_overdue_sla_job', { p_limit: 500 })

    // Find all failed SLA statuses for non-closed tickets
    const { data: failedSlas, error: slaError } = await db
      .from('helpdesk_ticket_sla_status')
      .select(`
        ticket_id,
        policy_id,
        status,
        deadline_at,
        ticket:helpdesk_tickets!inner(
          id, ticket_number, customer_email, owner_user_id,
          stage:helpdesk_ticket_stages!inner(is_closed)
        )
      `)
      .eq('status', 'failed')

    if (slaError) throw slaError

    for (const sla of failedSlas ?? []) {
      results.checked++

      // Skip tickets in closed stages (SLA excluded per spec)
      const ticket = asNestedRecord(sla.ticket)
      const stage = asNestedRecord(ticket?.stage)
      if (stage?.is_closed === true) continue

      const ticketId = sla.ticket_id
      const followupType = 'resolution_breach'

      // Check if we've already queued this breach
      const { data: existingQueue } = await db
        .from('helpdesk_followup_queue')
        .select('id')
        .eq('ticket_id', ticketId)
        .eq('followup_type', followupType)
        .is('cancelled_at', null)
        .maybeSingle()

      if (existingQueue) continue

      // Insert queue row
      const { error: insertError } = await db
        .from('helpdesk_followup_queue')
        .insert({
          ticket_id: ticketId,
          followup_type: followupType,
          scheduled_for: new Date().toISOString(),
        })

      if (insertError) {
        results.errors++
        console.error('[helpdesk-followup] Queue insert error:', insertError)
        continue
      }

      // Call helpdesk-email function
      try {
        const emailResp = await fetch(`${supabaseUrl}/functions/v1/helpdesk-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            'x-scheduler-secret': schedulerSecret,
          },
          body: JSON.stringify({
            type: 'followup_breach',
            ticketId,
            followupType,
          }),
        })

        if (!emailResp.ok) {
          const text = await emailResp.text()
          console.error(`[helpdesk-followup] Email send failed for ticket ${ticketId}: ${text}`)
          results.errors++
          continue
        }

        // Mark as sent
        await db
          .from('helpdesk_followup_queue')
          .update({ sent_at: new Date().toISOString() })
          .eq('ticket_id', ticketId)
          .eq('followup_type', followupType)
          .is('sent_at', null)

        results.queued++
      } catch (emailErr) {
        console.error('[helpdesk-followup] Email invoke error:', emailErr)
        results.errors++
      }
    }

    // Also check for first_response_breach: tickets with no first_response_at
    // and a failed SLA where deadline is the first applicable policy
    const { data: unanswered, error: unansweredError } = await db
      .from('helpdesk_tickets')
      .select(`
        id, ticket_number, customer_email, owner_user_id, first_response_at,
        stage:helpdesk_ticket_stages!inner(is_closed)
      `)
      .is('first_response_at', null)
      .neq('customer_email', null)

    if (!unansweredError) {
      for (const ticket of unanswered ?? []) {
        const ticketData = asRecord(ticket)
        const stage = asNestedRecord(ticketData?.stage)
        if (stage?.is_closed === true) continue

        const followupType = 'first_response_breach'

        // Check if SLA is actually failed
        const { data: slaBreach } = await db
          .from('helpdesk_ticket_sla_status')
          .select('id')
          .eq('ticket_id', ticket.id)
          .eq('status', 'failed')
          .maybeSingle()

        if (!slaBreach) continue

        // Check deduplication
        const { data: existingQueue } = await db
          .from('helpdesk_followup_queue')
          .select('id')
          .eq('ticket_id', ticket.id)
          .eq('followup_type', followupType)
          .is('cancelled_at', null)
          .maybeSingle()

        if (existingQueue) continue

        await db.from('helpdesk_followup_queue').insert({
          ticket_id: ticket.id,
          followup_type: followupType,
          scheduled_for: new Date().toISOString(),
        })

        try {
          const emailResp = await fetch(`${supabaseUrl}/functions/v1/helpdesk-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceKey}`,
              'x-scheduler-secret': schedulerSecret,
            },
            body: JSON.stringify({
              type: 'followup_breach',
              ticketId: ticket.id,
              followupType,
            }),
          })

          if (emailResp.ok) {
            await db
              .from('helpdesk_followup_queue')
              .update({ sent_at: new Date().toISOString() })
              .eq('ticket_id', ticket.id)
              .eq('followup_type', followupType)
              .is('sent_at', null)

            results.queued++
          } else {
            results.errors++
          }
        } catch {
          results.errors++
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[helpdesk-followup] Fatal error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
