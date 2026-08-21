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
