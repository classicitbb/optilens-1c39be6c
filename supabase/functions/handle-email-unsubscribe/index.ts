import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.25.76'
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/http/cors.ts'

const corsPolicy = createCorsPolicy({
  allowHeaders: 'authorization, x-client-info, apikey, content-type',
  allowMethods: 'GET, POST, OPTIONS',
})

const tokenSchema = z.string().trim().regex(/^[a-f0-9]{64}$/i, 'Invalid token format')

function jsonResponse(
  req: Request,
  data: Record<string, unknown>,
  status = 200,
): Response {
  const corsHeaders = getCorsHeaders(req, corsPolicy)
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy)
  if (preflight) return preflight

  const originBlocked = rejectDisallowedOrigin(req, corsPolicy)
  if (originBlocked) return originBlocked

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(req, { error: 'Server configuration error' }, 500)
  }

  const url = new URL(req.url)
  let token: string | null = url.searchParams.get('token')

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') ?? ''
    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (Number.isFinite(contentLength) && contentLength > 10_000) {
      return jsonResponse(req, { error: 'Payload too large' }, 413)
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formText = await req.text()
      const params = new URLSearchParams(formText)
      if (!params.get('List-Unsubscribe')) {
        const formToken = params.get('token')
        if (formToken) {
          token = formToken
        }
      }
    } else {
      try {
        const body = await req.json()
        if (body.token) {
          token = body.token
        }
      } catch {
        // Fall through — token stays from query param
      }
    }
  }

  if (!token) {
    return jsonResponse(req, { error: 'Token is required' }, 400)
  }

  const parsedToken = tokenSchema.safeParse(token)
  if (!parsedToken.success) {
    return jsonResponse(req, { error: parsedToken.error.issues[0]?.message ?? 'Invalid token format' }, 400)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: tokenRecord, error: lookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('*')
    .eq('token', parsedToken.data)
    .maybeSingle()

  if (lookupError || !tokenRecord) {
    return jsonResponse(req, { error: 'Invalid or expired token' }, 404)
  }

  if (tokenRecord.used_at) {
    return jsonResponse(req, { valid: false, reason: 'already_unsubscribed' })
  }

  if (req.method === 'GET') {
    return jsonResponse(req, { valid: true })
  }

  const { data: updated, error: updateError } = await supabase
    .from('email_unsubscribe_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', parsedToken.data)
    .is('used_at', null)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error('Failed to mark token as used', { error: updateError })
    return jsonResponse(req, { error: 'Failed to process unsubscribe' }, 500)
  }

  if (!updated) {
    return jsonResponse(req, { success: false, reason: 'already_unsubscribed' })
  }

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      { email: tokenRecord.email.toLowerCase(), reason: 'unsubscribe' },
      { onConflict: 'email' },
    )

  if (suppressError) {
    console.error('Failed to suppress email', {
      error: suppressError,
      email: tokenRecord.email,
    })
    return jsonResponse(req, { error: 'Failed to process unsubscribe' }, 500)
  }

  console.log('Email unsubscribed', { email: tokenRecord.email })

  return jsonResponse(req, { success: true })
})
