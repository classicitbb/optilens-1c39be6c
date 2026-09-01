import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/http/cors.ts'
import { requireAuthenticatedUser, requireUserRole } from '../_shared/http/auth.ts'
import { isAutoNotificationsDisabled } from '../_shared/email/smtp.ts'
import { sendManagedEmail } from '../_shared/email/managed-send.ts'
import { template } from '../_shared/transactional-email-templates/order-confirmation.tsx'

const SITE_NAME = 'Classic Visions'
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

  const messageId = `order-confirmation-${order.id}`

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

  const templateData = {
    customerName: order.customer_name || 'Customer',
    orderId: order.id,
    orderDate: new Date(order.created_at).toLocaleDateString(),
    items: items ?? [],
    totalAmount: Number(order.total_amount ?? 0),
    shippingAddress: formatAddress(order.shipping_address),
    siteUrl: SITE_URL,
  }

  const html = await renderAsync(React.createElement(template.component, templateData))
  const text = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  const result = await sendManagedEmail(supabase, {
    messageId,
    to: recipientEmail,
    from: `${SITE_NAME} Orders <orders@${FROM_DOMAIN}>`,
    subject,
    html,
    text,
    label: 'order-confirmation',
    idempotencyKey: messageId,
  })

  if (result.status === 'failed') {
    console.error('Failed to send order confirmation email', { orderId, error: result.error })
    return jsonResponse({ error: 'Failed to send email' }, 500, corsHeaders)
  }

  if (result.status === 'suppressed') {
    return jsonResponse({ success: false, reason: 'email_suppressed' }, 200, corsHeaders)
  }

  return jsonResponse({ success: true, sent: true }, 200, corsHeaders)
})
