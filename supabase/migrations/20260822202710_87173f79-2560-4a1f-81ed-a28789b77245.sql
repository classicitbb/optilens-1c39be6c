-- QBO OAuth gateway state. This schema deliberately stores no QBO client secret,
-- access token, refresh token, or realm ID. The short-lived authorization code is
-- encrypted by the Vercel gateway before it is inserted and can only be claimed
-- by the OptiLens Local service through an authenticated server-side function.

CREATE TABLE IF NOT EXISTS public.qbo_integration_state (
  provider text PRIMARY KEY DEFAULT 'quickbooks_online' CHECK (provider = 'quickbooks_online'),
  environment text NOT NULL DEFAULT 'production' CHECK (environment = 'production'),
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'connection_pending', 'connected', 'token_refresh_required', 'disconnected', 'error')),
  company_name text NULL,
  realm_id_masked text NULL,
  connected_at timestamptz NULL,
  last_refresh_at timestamptz NULL,
  last_reconciliation_status text NULL,
  last_reconciliation_at timestamptz NULL,
  last_error_code text NULL,
  last_error_message_sanitized text NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qbo_oauth_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash text NOT NULL UNIQUE CHECK (length(state_hash) = 64),
  redirect_uri text NOT NULL CHECK (redirect_uri = 'https://qbo.classicvisions.net/qbo/oauth/callback'),
  environment text NOT NULL DEFAULT 'production' CHECK (environment = 'production'),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  authorization_code_ciphertext text NULL,
  realm_id_masked text NULL,
  callback_received_at timestamptz NULL,
  claimed_at timestamptz NULL,
  claimed_by text NULL,
  completed_at timestamptz NULL,
  failure_code text NULL,
  failure_message_sanitized text NULL,
  CHECK (expires_at <= created_at + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS qbo_oauth_transactions_pending_idx
  ON public.qbo_oauth_transactions (expires_at, callback_received_at)
  WHERE completed_at IS NULL;

ALTER TABLE public.qbo_integration_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qbo_oauth_transactions ENABLE ROW LEVEL SECURITY;

-- Admin users may view sanitized connection state only. OAuth transaction rows
-- are server-to-server implementation detail and remain inaccessible via Data API.
DROP POLICY IF EXISTS "admins read qbo integration state" ON public.qbo_integration_state;
CREATE POLICY "admins read qbo integration state"
  ON public.qbo_integration_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.qbo_oauth_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.qbo_integration_state FROM anon, authenticated;
GRANT SELECT ON public.qbo_integration_state TO authenticated;

-- Durable, server-only commands for the outbound OptiLens Local worker.
CREATE TABLE public.qbo_integration_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command text NOT NULL CHECK (command IN ('disconnect', 'reconcile')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz NULL,
  completed_at timestamptz NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'completed', 'error')),
  result_sanitized jsonb NULL,
  error_message_sanitized text NULL
);
CREATE INDEX qbo_integration_commands_pending_idx ON public.qbo_integration_commands (requested_at) WHERE status = 'queued';
ALTER TABLE public.qbo_integration_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qbo_integration_commands FROM anon, authenticated;

-- Fixed-window rate limiting for the public QBO gateway. This function is
-- callable only with the server service key; no browser role can invoke it.
CREATE TABLE IF NOT EXISTS public.qbo_gateway_rate_limits (
  bucket_key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qbo_gateway_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qbo_gateway_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.qbo_consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  current_window timestamptz;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 OR length(p_bucket_key) > 200 THEN
    RAISE EXCEPTION 'invalid rate limit input';
  END IF;

  INSERT INTO public.qbo_gateway_rate_limits (bucket_key, request_count, window_started_at)
  VALUES (p_bucket_key, 1, now())
  ON CONFLICT (bucket_key) DO UPDATE
  SET request_count = CASE
        WHEN qbo_gateway_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          THEN 1
        ELSE qbo_gateway_rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN qbo_gateway_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          THEN now()
        ELSE qbo_gateway_rate_limits.window_started_at
      END,
      updated_at = now()
  RETURNING request_count, window_started_at INTO current_count, current_window;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.qbo_consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;