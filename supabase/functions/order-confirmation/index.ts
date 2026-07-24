import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/http/cors.ts'
import { requireAuthenticatedUser, requireUserRole } from '../_shared/http/auth.ts'
import { isAutoNotificationsDisabled } from '../_shared/email/smtp.ts'
import { template } from '../_shared/transactional-email-templates/order-confirmation.tsx'

const SITE_NAME = 'Classic Visions'
const SENDER_DOMAIN = 'support.classicvisions.net'
const FROM_DOMAIN = 'classicvisions.net'
const SITE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://classicvisions.net'

const corsPolicy = createCorsPolicy({
  allowHeaders: 'authorization, x-client-info, apikey, content-type',
  allowMethods: 'POST, OPTIONS',
})

const jsonResponse = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

const formatAddress = (value: unknown) => {
  if (!value || typeof value !== 'object') return ''
  const address = value as Record<string, unknown>
  return [
    address.recipient,
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ')
}

const generateToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req, corsPolicy)
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy)
  if (originBlocked) return originBlocked

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders)
  }

  const authContext = await requireAuthenticatedUser(req, corsHeaders)
  if (authContext instanceof Response) return authContext

  let orderId = ''
  try {
    const body = await req.json()
    orderId = typeof body.orderId === 'string' ? body.orderId : typeof body.order_id === 'string' ? body.order_id : ''
  } catch {
    return jsonResponse({ error: 'Invalid JSON in request body' }, 400, corsHeaders)
  }

  if (!orderId) {
    return jsonResponse({ error: 'orderId is required' }, 400, corsHeaders)
  }

  const supabase = authContext.supabaseAdminClient
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,user_id,customer_name,contact_email,total_amount,shipping_address,created_at')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError) {
    console.error('Failed to load order for confirmation email', { orderId, error: orderError })
    return jsonResponse({ error: 'Failed to load order' }, 500, corsHeaders)
  }

  if (!order) {
    return jsonResponse({ error: 'Order not found' }, 404, corsHeaders)
  }

  if (order.user_id !== authContext.user.id) {
    const roleCheck = await requireUserRole(
      supabase,
      authContext.user.id,
      ['admin', 'operator'],
      corsHeaders,
      { sourceFunction: 'order-confirmation', sourcePath: new URL(req.url).pathname },
    )
    if (roleCheck instanceof Response) return roleCheck
  }

  const recipientEmail = (order.contact_email || authContext.user.email || '').trim()
  if (!recipientEmail) {
    return jsonResponse({ success: true, skipped: 'missing_recipient_email' }, 200, corsHeaders)
  }

  const normalizedEmail = recipientEmail.toLowerCase()
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed for order confirmation', { orderId, error: suppressionError })
    return jsonResponse({ error: 'Failed to verify suppression status' }, 500, corsHeaders)
  }

  const messageId = `order-confirmation-${order.id}`

  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'order-confirmation',
      recipient_email: recipientEmail,
      status: 'suppressed',
    })
    return jsonResponse({ success: false, reason: 'email_suppressed' }, 200, corsHeaders)
  }

  const { data: existingSent } = await supabase
    .from('email_send_log')
    .select('id')
    .eq('message_id', messageId)
    .eq('status', 'sent')
    .maybeSingle()

  if (existingSent) {
    return jsonResponse({ success: true, skipped: 'already_sent' }, 200, corsHeaders)
  }

  if (await isAutoNotificationsDisabled(supabase, recipientEmail)) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'order-confirmation',
      recipient_email: recipientEmail,
      status: 'suppressed',
      error_message: 'Auto notifications disabled for this account',
    })
    return jsonResponse({ success: false, reason: 'auto_notifications_disabled' }, 200, corsHeaders)
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_name,quantity,product_price')
    .eq('order_id', order.id)

  if (itemsError) {
    console.error('Failed to load order items for confirmation email', { orderId, error: itemsError })
    return jsonResponse({ error: 'Failed to load order items' }, 500, corsHeaders)
  }

  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed for order confirmation', { orderId, error: tokenLookupError })
    return jsonResponse({ error: 'Failed to prepare email' }, 500, corsHeaders)
  }

  if (existingToken?.used_at) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'order-confirmation',
      recipient_email: recipientEmail,
      status: 'suppressed',
      error_message: 'Unsubscribe token already used',
    })
    return jsonResponse({ success: false, reason: 'email_suppressed' }, 200, corsHeaders)
  }

  let unsubscribeToken = existingToken?.token
  if (!unsubscribeToken) {
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert({ token: unsubscribeToken, email: normalizedEmail }, { onConflict: 'email', ignoreDuplicates: true })

    if (tokenError) {
      console.error('Failed to create unsubscribe token for order confirmation', { orderId, error: tokenError })
      return jsonResponse({ error: 'Failed to prepare email' }, 500, corsHeaders)
    }

    const { data: storedToken, error: reReadError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (reReadError || !storedToken?.token) {
      console.error('Failed to read unsubscribe token for order confirmation', { orderId, error: reReadError })
      return jsonResponse({ error: 'Failed to prepare email' }, 500, corsHeaders)
    }

    unsubscribeToken = storedToken.token
  }

  const templateData = {
    customerName: order.customer_name || 'Customer',
    orderId: order.id,
    orderDate: new Date(order.created_at).toLocaleDateString(),
    items: items ?? [],
    totalAmount: Number(order.total_amount ?? 0),
    shippingAddress: formatAddress(order.shipping_address),
    siteUrl: SITE_URL,
    unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
  }

  const html = await renderAsync(React.createElement(template.component, templateData))
  const text = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'order-confirmation',
    recipient_email: recipientEmail,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: `${SITE_NAME} Orders <orders@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: 'order-confirmation',
      idempotency_key: messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue order confirmation email', { orderId, error: enqueueError })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'order-confirmation',
      recipient_email: recipientEmail,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return jsonResponse({ error: 'Failed to enqueue email' }, 500, corsHeaders)
  }

  return jsonResponse({ success: true, queued: true }, 200, corsHeaders)
})
