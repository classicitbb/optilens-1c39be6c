-- Make QBO sandbox and production explicit, independently addressable environments.
-- Existing production rows remain production rows; sandbox starts with no connected state.

ALTER TABLE public.qbo_integration_state
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production';

ALTER TABLE public.qbo_integration_state
  DROP CONSTRAINT IF EXISTS qbo_integration_state_environment_check;
ALTER TABLE public.qbo_integration_state
  ADD CONSTRAINT qbo_integration_state_environment_check
  CHECK (environment IN ('sandbox', 'production'));

ALTER TABLE public.qbo_integration_state
  DROP CONSTRAINT IF EXISTS qbo_integration_state_pkey;
ALTER TABLE public.qbo_integration_state
  ADD CONSTRAINT qbo_integration_state_pkey PRIMARY KEY (provider, environment);

ALTER TABLE public.qbo_oauth_transactions
  DROP CONSTRAINT IF EXISTS qbo_oauth_transactions_redirect_uri_check,
  DROP CONSTRAINT IF EXISTS qbo_oauth_transactions_environment_check;
ALTER TABLE public.qbo_oauth_transactions
  ADD CONSTRAINT qbo_oauth_transactions_environment_check
  CHECK (environment IN ('sandbox', 'production')),
  ADD CONSTRAINT qbo_oauth_transactions_redirect_uri_check
  CHECK (
    (environment = 'production' AND redirect_uri = 'https://qbo.classicvisions.net/qbo/oauth/callback')
    OR
    (environment = 'sandbox' AND redirect_uri = 'https://qbo-sandbox.classicvisions.net/qbo/oauth/callback')
  );

ALTER TABLE public.qbo_integration_commands
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production';
ALTER TABLE public.qbo_integration_commands
  DROP CONSTRAINT IF EXISTS qbo_integration_commands_environment_check;
ALTER TABLE public.qbo_integration_commands
  ADD CONSTRAINT qbo_integration_commands_environment_check
  CHECK (environment IN ('sandbox', 'production'));

CREATE INDEX IF NOT EXISTS qbo_integration_commands_environment_idx
  ON public.qbo_integration_commands (environment, status, requested_at)
  WHERE status IN ('queued', 'claimed');

COMMENT ON COLUMN public.qbo_integration_state.environment IS 'QuickBooks environment; sandbox and production state are separate.';
COMMENT ON COLUMN public.qbo_oauth_transactions.environment IS 'QuickBooks environment bound to the redirect URI and Local credential store.';
COMMENT ON COLUMN public.qbo_integration_commands.environment IS 'QuickBooks environment whose private Local worker must execute the command.';
