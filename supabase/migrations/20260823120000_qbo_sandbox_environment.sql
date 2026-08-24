-- Keep sandbox OAuth state and commands separate from production. This migration
-- stores only sanitized state; QBO secrets and unmasked realm IDs remain on the
-- OptiLens Local Windows host.

ALTER TABLE public.qbo_integration_state
  DROP CONSTRAINT IF EXISTS qbo_integration_state_environment_check;
ALTER TABLE public.qbo_integration_state
  ADD CONSTRAINT qbo_integration_state_environment_check
  CHECK (environment IN ('sandbox', 'production'));

ALTER TABLE public.qbo_integration_state
  DROP CONSTRAINT IF EXISTS qbo_integration_state_pkey;
ALTER TABLE public.qbo_integration_state
  ADD PRIMARY KEY (provider, environment);

ALTER TABLE public.qbo_oauth_transactions
  DROP CONSTRAINT IF EXISTS qbo_oauth_transactions_environment_check;
ALTER TABLE public.qbo_oauth_transactions
  ADD CONSTRAINT qbo_oauth_transactions_environment_check
  CHECK (environment IN ('sandbox', 'production'));

ALTER TABLE public.qbo_oauth_transactions
  DROP CONSTRAINT IF EXISTS qbo_oauth_transactions_redirect_uri_check;
ALTER TABLE public.qbo_oauth_transactions
  ADD CONSTRAINT qbo_oauth_transactions_redirect_uri_check
  CHECK (redirect_uri IN (
    'https://qbo.classicvisions.net/qbo/oauth/callback',
    'https://qbo-sandbox.classicvisions.net/qbo/oauth/callback'
  ));

ALTER TABLE public.qbo_integration_commands
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production';
ALTER TABLE public.qbo_integration_commands
  DROP CONSTRAINT IF EXISTS qbo_integration_commands_environment_check;
ALTER TABLE public.qbo_integration_commands
  ADD CONSTRAINT qbo_integration_commands_environment_check
  CHECK (environment IN ('sandbox', 'production'));

DROP INDEX IF EXISTS public.qbo_integration_commands_pending_idx;
CREATE INDEX qbo_integration_commands_pending_by_environment_idx
  ON public.qbo_integration_commands (environment, requested_at)
  WHERE status = 'queued';

-- The existing state policy remains appropriate: authenticated administrators
-- can read sanitized rows only. No browser role receives write access.
