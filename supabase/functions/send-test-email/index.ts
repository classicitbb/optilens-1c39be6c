// Admin-only test sender for the Email Previews screen.
// Renders one registered template and sends it through Lovable's managed
// email API. Not a generic send endpoint: only registered template names are
// accepted and only admins/operators can call it.

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/http/cors.ts'
import { requirePrivilegedAccess } from '../_shared/http/auth.ts'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { sendManagedEmail, SITE_NAME, FROM_DOMAIN } from '../_shared/email/managed-send.ts'

const corsPolicy = createCorsPolicy({
  allowHeaders: 'authorization, x-admin-auth-token, x-client-info, apikey, content-type',
  allowMethods: 'POST, OPTIONS',
})

const jsonResponse = (status: number, body: unknown, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req, corsPolicy)
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy)
  if (originBlocked) return originBlocked

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, corsHeaders)
  }

  const authContext = await requirePrivilegedAccess(req, corsHeaders, {
    sourceFunction: 'send-test-email',
    allowedRoles: ['admin', 'operator'],
  })
  if (authContext instanceof Response) return authContext

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, corsHeaders)
  }

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, corsHeaders)
  }

  const templateName = String(body?.templateName || body?.template_name || '')
  const recipientEmail = String(body?.recipientEmail || body?.recipient_email || '').trim()
  const templateData = (body?.templateData && typeof body.templateData === 'object') ? body.templateData : {}

  const template = TEMPLATES[templateName]
  if (!template) return jsonResponse(400, { error: `Unknown template: ${templateName}` }, corsHeaders)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return jsonResponse(400, { error: 'Invalid recipient email' }, corsHeaders)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const html = await renderAsync(React.createElement(template.component, templateData))
  const text = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  const messageId = crypto.randomUUID()
  const result = await sendManagedEmail(supabase, {
    messageId,
    to: recipientEmail,
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    subject,
    html,
    text,
    label: templateName,
    idempotencyKey: messageId,
    logMetadata: { send_mode: 'manual', initiated_by: authContext.user?.id ?? null },
  })

  if (result.status === 'failed') {
    return jsonResponse(500, { success: false, error: result.error }, corsHeaders)
  }
  if (result.status === 'suppressed') {
    return jsonResponse(200, { success: false, reason: 'email_suppressed' }, corsHeaders)
  }

  return jsonResponse(200, { success: true, messageId }, corsHeaders)
})
