/**
 * customer-onboarding
 *
 * Called internally (admin-only) after a new customer account is created.
 * It:
 *   1. Finds the default template pricelist (is_template = true, first created)
 *   2. Assigns it to the new customer via customer_pricing_access
 *   3. Enqueues a welcome email with the pricelist name and login link
 *
 * POST body:
 *   { userId: string, email: string, displayName?: string }
 *
 * Requires: admin role (checked via requirePrivilegedAccess)
 *
 * CI/monitoring smoke test: POST { smokeTest: true, email } with an
 * x-api-key scoped to `customer-onboarding:smoke` runs only step 3 (welcome
 * email enqueue) against the given email — no pricelist read/assignment, no
 * real userId. See scripts/email_pipeline_smoke.mjs.
 *
 * Env secrets used (inherited from project):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_BASE_URL
 */

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/http/cors.ts'
import { requirePrivilegedAccess } from '../_shared/http/auth.ts'
import { getOrCreateUnsubscribeToken, isAutoNotificationsDisabled } from '../_shared/email/smtp.ts'
import { template as welcomeTemplate } from '../_shared/transactional-email-templates/welcome-pricelist.tsx'

const SITE_NAME = 'Classic Visions'
const FROM_DOMAIN = 'classicvisions.net'
const SITE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://classicvisions.net'

const corsPolicy = createCorsPolicy({
  allowHeaders: 'authorization, x-admin-auth-token, x-client-info, apikey, content-type, x-api-key',
  allowMethods: 'POST, OPTIONS',
})

const jsonResponse = (status: number, body: unknown, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const generateMessageId = () => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Shared by the real onboarding flow and the CI smoke-test path so both
// exercise the exact same send logic — no separate "test" implementation to
// drift out of sync with what actually ships.
async function enqueueWelcomeEmail(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  params: { userId: string; email: string; displayName?: string; pricelistName: string },
  corsHeaders: Record<string, string>,
  pricelistInfo: { pricelistAssigned: boolean; pricelistVersionId: string | number | null },
): Promise<Response> {
  const { userId, email, displayName, pricelistName } = params
  const { pricelistAssigned, pricelistVersionId } = pricelistInfo

  if (await isAutoNotificationsDisabled(supabase, email)) {
    await supabase.from('email_send_log').insert({
      message_id: generateMessageId(),
      template_name: 'welcome-pricelist',
      recipient_email: email,
      status: 'suppressed',
      error_message: 'Auto notifications disabled for this account',
    })
    return jsonResponse(200, {
      success: true,
      pricelistAssigned,
      pricelistVersionId,
      emailQueued: false,
      reason: 'auto_notifications_disabled',
    }, corsHeaders)
  }

  const loginUrl = `${SITE_URL}/login`
  const customerName = displayName ?? email.split('@')[0]

  const templateData = {
    customerName,
    pricelistName,
    siteUrl: SITE_URL,
    loginUrl,
  }

  const unsubscribeToken = await getOrCreateUnsubscribeToken(supabase, email)
  const renderData = {
    ...templateData,
    unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
  }

  let html: string
  let text: string
  try {
    html = await renderAsync(React.createElement(welcomeTemplate.component, renderData))
    text = await renderAsync(React.createElement(welcomeTemplate.component, renderData), { plainText: true })
  } catch (renderErr) {
    console.error('customer-onboarding: failed to render welcome email', renderErr)
    return jsonResponse(500, { error: 'Failed to render email' }, corsHeaders)
  }

  const subject = typeof welcomeTemplate.subject === 'function'
    ? welcomeTemplate.subject(templateData)
    : welcomeTemplate.subject

  const messageId = generateMessageId()

  // Log the send attempt
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'welcome-pricelist',
    recipient_email: email,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <welcome@${FROM_DOMAIN}>`,
      sender_domain: `support.${FROM_DOMAIN}`,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: 'welcome-pricelist',
      idempotency_key: `welcome-pricelist-${userId}`,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('customer-onboarding: failed to enqueue welcome email', enqueueError)
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'welcome-pricelist',
      recipient_email: email,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    // Don't fail the whole request — pricelist was already assigned
    return jsonResponse(207, {
      success: true,
      pricelistAssigned,
      emailQueued: false,
      warning: 'Pricelist assigned but welcome email could not be queued',
    }, corsHeaders)
  }

  console.log('customer-onboarding: welcome email queued', { messageId, email })

  return jsonResponse(200, {
    success: true,
    pricelistAssigned,
    pricelistVersionId,
    emailQueued: true,
  }, corsHeaders)
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req, corsPolicy)
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy)
  if (originBlocked) return originBlocked

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, corsHeaders)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, corsHeaders)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // CI/monitoring smoke test: exercises only the welcome-email enqueue path
  // (step 3 below) with a caller-supplied test email — never the pricelist
  // read/assignment steps, and never a real userId. This keeps the scoped
  // key read-only in effect: the only writes it can cause are an
  // email_send_log row and a transactional_emails queue entry, the same
  // category of write scripts/email_pipeline_smoke.mjs already makes
  // against contact-inquiry. Real onboarding (admin-invoked, real user,
  // real pricelist assignment) still requires the full admin JWT below.
  const apiKey = req.headers.get('x-api-key')
  let smokeTestAuthorized = false
  if (body.smokeTest === true && apiKey) {
    const { data: keyRows } = await supabase.rpc('verify_api_key', { p_token: apiKey })
    const key = Array.isArray(keyRows) ? keyRows[0] : keyRows
    const scopes: string[] = Array.isArray(key?.scopes) ? key.scopes : []
    smokeTestAuthorized = scopes.includes('customer-onboarding:smoke')
  }

  if (smokeTestAuthorized) {
    const smokeEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!smokeEmail) {
      return jsonResponse(400, { error: 'email is required' }, corsHeaders)
    }
    return await enqueueWelcomeEmail(supabase, {
      userId: `smoke-test-${crypto.randomUUID()}`,
      email: smokeEmail,
      displayName: 'CI Smoke Test',
      pricelistName: 'your pricelist',
    }, corsHeaders, { pricelistAssigned: false, pricelistVersionId: null })
  }

  // Require admin role
  const authContext = await requirePrivilegedAccess(req, corsHeaders, {
    allowedRoles: ['admin'],
    sourceFunction: 'customer-onboarding',
  })
  if (authContext instanceof Response) return authContext

  const userId = typeof body.userId === 'string' ? body.userId : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const displayName = typeof body.displayName === 'string' ? body.displayName : undefined
  const suppressEmail = body.suppressEmail === true

  if (!userId || !email) {
    return jsonResponse(400, { error: 'userId and email are required' }, corsHeaders)
  }

  // ── 1. Find the default template pricelist ──────────────────────────────────
  const { data: templateVersions, error: pvError } = await (supabase.from('pricelist_versions') as any)
    .select('id, name')
    .eq('is_template', true)
    .order('created_at', { ascending: true })
    .limit(1)

  if (pvError) {
    console.error('customer-onboarding: failed to load template pricelist', pvError)
    return jsonResponse(500, { error: 'Failed to load pricelist template' }, corsHeaders)
  }

  const defaultVersion = templateVersions?.[0]

  if (!defaultVersion) {
    // No template exists yet — skip assignment but still send a general welcome
    console.warn('customer-onboarding: no template pricelist found, skipping assignment')
  }

  // ── 2. Assign pricelist to customer (idempotent) ────────────────────────────
  if (defaultVersion) {
    // Check if already assigned to avoid duplicates
    const { data: existing } = await (supabase.from('customer_pricing_access') as any)
      .select('id')
      .eq('user_id', userId)
      .eq('pricing_sheet_id', String(defaultVersion.id))
      .maybeSingle()

    if (!existing) {
      const { error: assignError } = await (supabase.from('customer_pricing_access') as any)
        .insert({ user_id: userId, pricing_sheet_id: String(defaultVersion.id) })

      if (assignError) {
        console.error('customer-onboarding: failed to assign pricelist', assignError)
        return jsonResponse(500, { error: 'Failed to assign pricelist' }, corsHeaders)
      }

      console.log('customer-onboarding: assigned pricelist', {
        userId,
        pricelistVersionId: defaultVersion.id,
        pricelistName: defaultVersion.name,
      })
    } else {
      console.log('customer-onboarding: pricelist already assigned, skipping', { userId })
    }
  }

  // ── 3. Enqueue welcome email ────────────────────────────────────────────────
  // Admin-initiated account setup (invite/create) defaults to suppressing this —
  // an admin configuring a portal account is not the same as the customer
  // actually being ready to receive mail. The pricelist assignment above still
  // happens either way.
  if (suppressEmail) {
    await supabase.from('email_send_log').insert({
      message_id: generateMessageId(),
      template_name: 'welcome-pricelist',
      recipient_email: email,
      status: 'suppressed',
      error_message: 'Suppressed by admin during account configuration',
    })
    return jsonResponse(200, {
      success: true,
      pricelistAssigned: !!defaultVersion,
      pricelistVersionId: defaultVersion?.id ?? null,
      emailQueued: false,
      reason: 'admin_suppressed',
    }, corsHeaders)
  }

  return await enqueueWelcomeEmail(supabase, {
    userId,
    email,
    displayName,
    pricelistName: defaultVersion?.name ?? 'your pricelist',
  }, corsHeaders, {
    pricelistAssigned: !!defaultVersion,
    pricelistVersionId: defaultVersion?.id ?? null,
  })
})
