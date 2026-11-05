/**
 * crm-unsubscribe
 *
 * Public link in every CRM outreach email. GET ?t=<contactId.hmac> records the
 * contact's marketing opt-out; the runner then stops sending and exits their
 * cadence enrolments. Authenticated only by the signed token, so verify_jwt is
 * off (see supabase/config.toml).
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRM_UNSUBSCRIBE_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { verifyUnsubscribeToken } from '../_shared/crm/cadenceRules.ts'

const page = (status: number, title: string, message: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:Arial,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;color:#222"><h1 style="font-size:20px">${title}</h1><p>${message}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return page(405, 'Not allowed', 'This link cannot be used this way.')

  const secret = Deno.env.get('CRM_UNSUBSCRIBE_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!secret || !supabaseUrl || !serviceKey) return page(503, 'Unavailable', 'Please try again later or reply to the email and ask to be removed.')

  const contactId = await verifyUnsubscribeToken(new URL(req.url).searchParams.get('t') ?? '', secret)
  if (!contactId) return page(400, 'Link not valid', 'This unsubscribe link is not valid. Reply to the email and we will remove you.')

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const { error } = await db
    .from('contacts')
    .update({ marketing_opt_out_at: new Date().toISOString(), marketing_opt_out_source: 'email_link' })
    .eq('id', contactId)
    .is('marketing_opt_out_at', null)
  if (error) {
    console.error('crm-unsubscribe update failed', error.message)
    return page(500, 'Something went wrong', 'Please reply to the email and ask to be removed.')
  }

  await db
    .from('cadence_enrollments')
    .update({ status: 'exited', next_step_due_at: null, last_error: 'opted_out' })
    .eq('contact_id', contactId)
    .eq('status', 'active')

  return page(200, 'You are unsubscribed', 'We will not send you further outreach emails. Order and account messages you have asked for are not affected.')
})
