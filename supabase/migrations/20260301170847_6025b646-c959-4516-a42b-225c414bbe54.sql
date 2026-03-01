-- Create tables if they don't exist

CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  provider text NOT NULL CHECK (provider = 'odoo'),
  environment text NOT NULL DEFAULT 'production',
  base_url text NOT NULL DEFAULT '',
  database_name text NOT NULL DEFAULT '',
  user_identifier text,
  auth_mode text NOT NULL DEFAULT 'password' CHECK (auth_mode IN ('api_key', 'password')),
  status text NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured', 'connected', 'error')),
  last_health_check_at timestamptz,
  last_sync_cursor_at timestamptz,
  last_sync_import_count integer NOT NULL DEFAULT 0,
  last_sync_export_count integer NOT NULL DEFAULT 0,
  last_sync_failure_count integer NOT NULL DEFAULT 0,
  retry_state text,
  incremental_enabled boolean NOT NULL DEFAULT true,
  dry_run_enabled boolean NOT NULL DEFAULT false,
  sync_direction text NOT NULL DEFAULT 'import_only' CHECK (sync_direction IN ('import_only', 'export_only', 'two_way')),
  conflict_policy text NOT NULL DEFAULT 'prefer_odoo',
  sync_batch_size integer NOT NULL DEFAULT 100,
  sync_interval_minutes integer NOT NULL DEFAULT 15,
  pull_cursor timestamptz,
  push_cursor timestamptz,
  last_sync_started_at timestamptz,
  last_sync_finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_key, provider)
);

ALTER TABLE public.integration_connections
  ADD COLUMN IF NOT EXISTS sync_batch_size integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS sync_interval_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS pull_cursor timestamptz,
  ADD COLUMN IF NOT EXISTS push_cursor timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_finished_at timestamptz;

ALTER TABLE public.integration_connections
  DROP CONSTRAINT IF EXISTS integration_connections_conflict_policy_check;
ALTER TABLE public.integration_connections
  ADD CONSTRAINT integration_connections_conflict_policy_check
  CHECK (conflict_policy IN ('prefer_odoo', 'prefer_optilens', 'newest_write_date', 'manual_review'));

CREATE TABLE IF NOT EXISTS public.integration_connection_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  key_version integer NOT NULL DEFAULT 1,
  encrypted_secret bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_connection_id)
);

CREATE TABLE IF NOT EXISTS public.integration_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  tenant_key text NOT NULL,
  provider text NOT NULL CHECK (provider = 'odoo'),
  sync_kind text NOT NULL CHECK (sync_kind IN ('initial', 'incremental')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed')),
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  tenant_key text NOT NULL,
  provider text NOT NULL,
  event_type text NOT NULL,
  actor_user_id uuid,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_structured_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  tenant_key text NOT NULL,
  provider text NOT NULL,
  log_level text NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  redacted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_conflict_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  tenant_key text NOT NULL,
  provider text NOT NULL,
  source_model text NOT NULL,
  source_identifier text NOT NULL,
  local_identifier uuid,
  conflict_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution_status text NOT NULL DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'dismissed')),
  resolution_winner text CHECK (resolution_winner IN ('odoo', 'optilens')),
  overridden_by uuid,
  overridden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_sync_run_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  sync_job_id uuid REFERENCES public.integration_sync_jobs(id) ON DELETE SET NULL,
  tenant_key text NOT NULL,
  provider text NOT NULL,
  run_started_at timestamptz NOT NULL,
  run_completed_at timestamptz,
  success boolean NOT NULL DEFAULT false,
  source_cursor_at timestamptz,
  records_processed integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  source_lag_seconds integer,
  error_rate numeric(8,4) GENERATED ALWAYS AS (
    CASE WHEN records_processed <= 0 THEN 0
    ELSE ROUND(records_failed::numeric / GREATEST(records_processed, 1), 4) END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_sync_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  sync_job_id uuid REFERENCES public.integration_sync_jobs(id) ON DELETE SET NULL,
  tenant_key text NOT NULL,
  provider text NOT NULL CHECK (provider = 'odoo'),
  source_model text NOT NULL DEFAULT 'res.partner',
  source_identifier text NOT NULL,
  local_identifier uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  error_code text,
  error_message text NOT NULL,
  error_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  redacted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'retry_queued', 'resolved', 'ignored')),
  retry_count integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  run_type text NOT NULL CHECK (run_type IN ('pull', 'push', 'webhook')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  pull_records_processed integer NOT NULL DEFAULT 0,
  push_records_processed integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  cursor_advanced boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_sync_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  sync_direction text NOT NULL CHECK (sync_direction IN ('pull', 'push')),
  external_id text,
  local_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'resolved', 'failed_permanent')),
  last_error text,
  error_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_sync_manual_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  external_id text,
  local_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  reason text NOT NULL,
  remote_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  local_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_audit_events_connection_created ON public.integration_audit_events(integration_connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_structured_logs_tenant_provider_created ON public.integration_structured_logs(tenant_key, provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_conflict_queue_status ON public.integration_conflict_queue(tenant_key, provider, resolution_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_sync_run_metrics_connection_started ON public.integration_sync_run_metrics(integration_connection_id, run_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_sync_errors_connection_status ON public.integration_sync_errors(integration_connection_id, status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_sync_errors_tenant_provider_status ON public.integration_sync_errors(tenant_key, provider, status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_sync_dead_letters_retry ON public.contact_sync_dead_letters(status, next_retry_at);

-- View
CREATE OR REPLACE VIEW public.integration_health_metrics_dashboard AS
SELECT
  c.id AS integration_connection_id, c.tenant_key, c.provider,
  MAX(CASE WHEN m.success THEN m.run_completed_at END) AS last_successful_run_at,
  COALESCE(MAX(m.source_lag_seconds), 0) AS lag_behind_source_seconds,
  COALESCE(ROUND(AVG(m.error_rate), 4), 0) AS error_rate,
  COALESCE(ROUND(AVG(m.records_processed), 2), 0) AS records_processed_per_run
FROM public.integration_connections c
LEFT JOIN public.integration_sync_run_metrics m ON m.integration_connection_id = c.id
GROUP BY c.id, c.tenant_key, c.provider;

-- RLS
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connection_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_structured_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_conflict_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_run_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sync_dead_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sync_manual_review_queue ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage integration_connections" ON public.integration_connections;
CREATE POLICY "Admins can manage integration_connections" ON public.integration_connections FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage integration_connection_secrets" ON public.integration_connection_secrets;
DROP POLICY IF EXISTS "No direct access to integration_connection_secrets" ON public.integration_connection_secrets;
CREATE POLICY "No direct access to integration_connection_secrets" ON public.integration_connection_secrets FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Admins can manage integration_sync_jobs" ON public.integration_sync_jobs;
CREATE POLICY "Admins can manage integration_sync_jobs" ON public.integration_sync_jobs FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage integration_audit_events" ON public.integration_audit_events;
CREATE POLICY "Admins can manage integration_audit_events" ON public.integration_audit_events FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage integration_structured_logs" ON public.integration_structured_logs;
CREATE POLICY "Admins can manage integration_structured_logs" ON public.integration_structured_logs FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage integration_conflict_queue" ON public.integration_conflict_queue;
CREATE POLICY "Admins can manage integration_conflict_queue" ON public.integration_conflict_queue FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage integration_sync_run_metrics" ON public.integration_sync_run_metrics;
CREATE POLICY "Admins can manage integration_sync_run_metrics" ON public.integration_sync_run_metrics FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage integration_sync_errors" ON public.integration_sync_errors;
CREATE POLICY "Admins can manage integration_sync_errors" ON public.integration_sync_errors FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage contact_sync_runs" ON public.contact_sync_runs;
CREATE POLICY "Admins can manage contact_sync_runs" ON public.contact_sync_runs FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage contact_sync_dead_letters" ON public.contact_sync_dead_letters;
CREATE POLICY "Admins can manage contact_sync_dead_letters" ON public.contact_sync_dead_letters FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage contact_sync_manual_review_queue" ON public.contact_sync_manual_review_queue;
CREATE POLICY "Admins can manage contact_sync_manual_review_queue" ON public.contact_sync_manual_review_queue FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Helper functions (using extensions.pgp_sym_encrypt/decrypt)
CREATE OR REPLACE FUNCTION public.integration_secret_encryption_key()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE key_value text;
BEGIN
  key_value := current_setting('app.integration_secret_key', true);
  IF key_value IS NULL OR key_value = '' THEN key_value := 'integration-secret-fallback-v1'; END IF;
  RETURN key_value;
END; $$;

CREATE OR REPLACE FUNCTION public.redact_pii_jsonb(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_result jsonb := '{}'::jsonb; v_key text; v_val jsonb;
BEGIN
  IF p_payload IS NULL THEN RETURN '{}'::jsonb; END IF;
  IF jsonb_typeof(p_payload) = 'array' THEN
    RETURN (SELECT jsonb_agg(public.redact_pii_jsonb(elem)) FROM jsonb_array_elements(p_payload) elem);
  END IF;
  IF jsonb_typeof(p_payload) <> 'object' THEN RETURN p_payload; END IF;
  FOR v_key, v_val IN SELECT key, value FROM jsonb_each(p_payload) LOOP
    IF v_key ~* '(password|secret|token|credential|authorization|api[_-]?key|ssn|tax_id|vat|email|phone)' THEN
      v_result := v_result || jsonb_build_object(v_key, '[REDACTED]');
    ELSE
      v_result := v_result || jsonb_build_object(v_key, public.redact_pii_jsonb(v_val));
    END IF;
  END LOOP;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.log_integration_event(
  p_integration_connection_id uuid, p_tenant_key text, p_provider text,
  p_log_level text, p_event_name text, p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.integration_structured_logs (integration_connection_id, tenant_key, provider, log_level, event_name, payload, redacted_payload)
  VALUES (p_integration_connection_id, COALESCE(NULLIF(p_tenant_key, ''), 'default'), p_provider, p_log_level, p_event_name, COALESCE(p_payload, '{}'::jsonb), public.redact_pii_jsonb(COALESCE(p_payload, '{}'::jsonb)))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- Main upsert function (13 params)
CREATE OR REPLACE FUNCTION public.upsert_integration_connection(
  p_tenant_key text, p_provider text, p_environment text, p_base_url text,
  p_database_name text, p_user_identifier text, p_auth_mode text,
  p_sync_direction text, p_conflict_policy text, p_incremental_enabled boolean,
  p_dry_run_enabled boolean, p_credential_value text, p_test_connection boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_connection_id uuid; v_previous_conflict_policy text; v_tenant_key text := COALESCE(NULLIF(p_tenant_key, ''), 'default');
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can manage integration credentials.'; END IF;

  SELECT conflict_policy INTO v_previous_conflict_policy FROM public.integration_connections WHERE tenant_key = v_tenant_key AND provider = p_provider;

  INSERT INTO public.integration_connections (tenant_key, provider, environment, base_url, database_name, user_identifier, auth_mode, sync_direction, conflict_policy, incremental_enabled, dry_run_enabled, status, last_health_check_at)
  VALUES (v_tenant_key, p_provider, p_environment, p_base_url, p_database_name, p_user_identifier, p_auth_mode, p_sync_direction, p_conflict_policy, p_incremental_enabled, p_dry_run_enabled,
    CASE WHEN p_test_connection THEN 'connected' ELSE 'not_configured' END,
    CASE WHEN p_test_connection THEN now() ELSE NULL END)
  ON CONFLICT (tenant_key, provider) DO UPDATE SET
    environment = EXCLUDED.environment, base_url = EXCLUDED.base_url, database_name = EXCLUDED.database_name,
    user_identifier = EXCLUDED.user_identifier, auth_mode = EXCLUDED.auth_mode, sync_direction = EXCLUDED.sync_direction,
    conflict_policy = EXCLUDED.conflict_policy, incremental_enabled = EXCLUDED.incremental_enabled, dry_run_enabled = EXCLUDED.dry_run_enabled,
    status = CASE WHEN p_test_connection THEN 'connected' ELSE public.integration_connections.status END,
    last_health_check_at = CASE WHEN p_test_connection THEN now() ELSE public.integration_connections.last_health_check_at END,
    updated_at = now()
  RETURNING id INTO v_connection_id;

  IF p_credential_value IS NOT NULL AND p_credential_value <> '' THEN
    INSERT INTO public.integration_connection_secrets (integration_connection_id, encrypted_secret, updated_at)
    VALUES (v_connection_id, extensions.pgp_sym_encrypt(p_credential_value, public.integration_secret_encryption_key()), now())
    ON CONFLICT (integration_connection_id) DO UPDATE SET encrypted_secret = EXCLUDED.encrypted_secret, updated_at = now();

    INSERT INTO public.integration_audit_events (integration_connection_id, tenant_key, provider, event_type, actor_user_id, event_payload)
    VALUES (v_connection_id, v_tenant_key, p_provider, 'credentials_changed', auth.uid(), jsonb_build_object('auth_mode', p_auth_mode, 'key_rotated', true));
  END IF;

  IF p_test_connection THEN
    INSERT INTO public.integration_audit_events (integration_connection_id, tenant_key, provider, event_type, actor_user_id, event_payload)
    VALUES (v_connection_id, v_tenant_key, p_provider, 'connection_tested', auth.uid(), jsonb_build_object('status', 'connected'));
  END IF;

  IF v_previous_conflict_policy IS DISTINCT FROM p_conflict_policy THEN
    INSERT INTO public.integration_audit_events (integration_connection_id, tenant_key, provider, event_type, actor_user_id, event_payload)
    VALUES (v_connection_id, v_tenant_key, p_provider, 'conflict_policy_overridden', auth.uid(), jsonb_build_object('from', v_previous_conflict_policy, 'to', p_conflict_policy));
  END IF;

  PERFORM public.log_integration_event(v_connection_id, v_tenant_key, p_provider, 'info', 'integration_configuration_upserted',
    jsonb_build_object('test_connection', p_test_connection, 'auth_mode', p_auth_mode, 'conflict_policy', p_conflict_policy, 'credential_supplied', p_credential_value IS NOT NULL AND p_credential_value <> ''));

  RETURN v_connection_id;
END; $$;

-- Overload without p_test_connection (12 params)
CREATE OR REPLACE FUNCTION public.upsert_integration_connection(
  p_tenant_key text, p_provider text, p_environment text, p_base_url text,
  p_database_name text, p_user_identifier text, p_auth_mode text,
  p_sync_direction text, p_conflict_policy text, p_incremental_enabled boolean,
  p_dry_run_enabled boolean, p_credential_value text
) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.upsert_integration_connection(p_tenant_key, p_provider, p_environment, p_base_url, p_database_name, p_user_identifier, p_auth_mode, p_sync_direction, p_conflict_policy, p_incremental_enabled, p_dry_run_enabled, p_credential_value, false);
$$;

-- Alias: upsert_integration_connection_with_secret (13 params)
CREATE OR REPLACE FUNCTION public.upsert_integration_connection_with_secret(
  p_tenant_key text, p_provider text, p_environment text, p_base_url text,
  p_database_name text, p_user_identifier text, p_auth_mode text,
  p_sync_direction text, p_conflict_policy text, p_incremental_enabled boolean,
  p_dry_run_enabled boolean, p_credential_value text, p_test_connection boolean DEFAULT false
) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.upsert_integration_connection(p_tenant_key, p_provider, p_environment, p_base_url, p_database_name, p_user_identifier, p_auth_mode, p_sync_direction, p_conflict_policy, p_incremental_enabled, p_dry_run_enabled, p_credential_value, p_test_connection);
$$;

-- Alias: upsert_integration_connection_with_secret (12 params)
CREATE OR REPLACE FUNCTION public.upsert_integration_connection_with_secret(
  p_tenant_key text, p_provider text, p_environment text, p_base_url text,
  p_database_name text, p_user_identifier text, p_auth_mode text,
  p_sync_direction text, p_conflict_policy text, p_incremental_enabled boolean,
  p_dry_run_enabled boolean, p_credential_value text
) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.upsert_integration_connection_with_secret(p_tenant_key, p_provider, p_environment, p_base_url, p_database_name, p_user_identifier, p_auth_mode, p_sync_direction, p_conflict_policy, p_incremental_enabled, p_dry_run_enabled, p_credential_value, false);
$$;

-- trigger_integration_sync_job
CREATE OR REPLACE FUNCTION public.trigger_integration_sync_job(
  p_tenant_key text, p_provider text, p_sync_kind text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_connection_id uuid; v_job_id uuid; v_tenant_key text := COALESCE(NULLIF(p_tenant_key, ''), 'default'); v_lock_key bigint;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can trigger integration sync jobs.'; END IF;
  v_lock_key := hashtextextended(v_tenant_key || ':' || p_provider, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  SELECT id INTO v_connection_id FROM public.integration_connections WHERE tenant_key = v_tenant_key AND provider = p_provider;
  IF v_connection_id IS NULL THEN RAISE EXCEPTION 'Integration is not configured for this tenant/provider.'; END IF;
  IF EXISTS (SELECT 1 FROM public.integration_sync_jobs WHERE integration_connection_id = v_connection_id AND status IN ('queued', 'running')) THEN
    RAISE EXCEPTION 'A sync run is already queued or running for this tenant/provider.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.integration_sync_jobs WHERE integration_connection_id = v_connection_id AND requested_at >= now() - interval '60 seconds') THEN
    RAISE EXCEPTION 'Sync trigger rate-limited. Please wait before retrying.';
  END IF;
  INSERT INTO public.integration_sync_jobs (integration_connection_id, tenant_key, provider, sync_kind, requested_by, status)
  VALUES (v_connection_id, v_tenant_key, p_provider, p_sync_kind, auth.uid(), 'queued') RETURNING id INTO v_job_id;
  UPDATE public.integration_connections SET retry_state = 'queued', updated_at = now() WHERE id = v_connection_id;
  INSERT INTO public.integration_audit_events (integration_connection_id, tenant_key, provider, event_type, actor_user_id, event_payload)
  VALUES (v_connection_id, v_tenant_key, p_provider, 'manual_sync_triggered', auth.uid(), jsonb_build_object('sync_kind', p_sync_kind, 'sync_job_id', v_job_id));
  PERFORM public.log_integration_event(v_connection_id, v_tenant_key, p_provider, 'info', 'manual_sync_triggered', jsonb_build_object('sync_kind', p_sync_kind, 'sync_job_id', v_job_id));
  RETURN v_job_id;
END; $$;

-- manage_integration_sync_error
CREATE OR REPLACE FUNCTION public.manage_integration_sync_error(p_error_id uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_action text := lower(coalesce(p_action, ''));
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can manage sync errors.'; END IF;
  IF v_action = 'retry' THEN
    UPDATE public.integration_sync_errors SET status='retry_queued', retry_count=retry_count+1, resolved_at=NULL, resolved_by=NULL, updated_at=now() WHERE id=p_error_id;
  ELSIF v_action = 'resolve' THEN
    UPDATE public.integration_sync_errors SET status='resolved', resolved_at=now(), resolved_by=auth.uid(), updated_at=now() WHERE id=p_error_id;
  ELSIF v_action = 'ignore' THEN
    UPDATE public.integration_sync_errors SET status='ignored', resolved_at=now(), resolved_by=auth.uid(), updated_at=now() WHERE id=p_error_id;
  ELSE RAISE EXCEPTION 'Unsupported sync error action: %', p_action;
  END IF;
END; $$;

-- get_integration_connection_secret (uses extensions schema)
CREATE OR REPLACE FUNCTION public.get_integration_connection_secret(p_connection_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT extensions.pgp_sym_decrypt(ics.encrypted_secret, public.integration_secret_encryption_key())::text
  FROM public.integration_connection_secrets ics WHERE ics.integration_connection_id = p_connection_id;
$$;

-- enqueue_due_odoo_sync_jobs
CREATE OR REPLACE FUNCTION public.enqueue_due_odoo_sync_jobs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0;
BEGIN
  WITH due AS (
    SELECT id, tenant_key FROM public.integration_connections
    WHERE provider = 'odoo' AND status = 'connected'
      AND (last_sync_started_at IS NULL OR now() >= (last_sync_started_at + make_interval(mins => sync_interval_minutes)))
  ), inserted AS (
    INSERT INTO public.integration_sync_jobs (integration_connection_id, tenant_key, provider, sync_kind, requested_by, status, requested_at)
    SELECT due.id, due.tenant_key, 'odoo', 'incremental',
      COALESCE((SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid), 'queued', now()
    FROM due WHERE NOT EXISTS (SELECT 1 FROM public.integration_sync_jobs j WHERE j.integration_connection_id = due.id AND j.status IN ('queued', 'running'))
    RETURNING 1
  ) SELECT COUNT(*) INTO v_count FROM inserted;
  UPDATE public.integration_connections c SET last_sync_started_at = now(), updated_at = now()
  WHERE c.id IN (SELECT id FROM due) AND EXISTS (SELECT 1 FROM public.integration_sync_jobs j WHERE j.integration_connection_id = c.id AND j.status = 'queued' AND j.requested_at >= now() - interval '1 minute');
  RETURN v_count;
END; $$;

-- Grants
REVOKE ALL ON FUNCTION public.get_integration_connection_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_integration_connection_secret(uuid) TO service_role;
GRANT SELECT ON public.integration_health_metrics_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_integration_event(uuid, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_integration_connection(text, text, text, text, text, text, text, text, text, boolean, boolean, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_integration_connection(text, text, text, text, text, text, text, text, text, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_integration_connection_with_secret(text, text, text, text, text, text, text, text, text, boolean, boolean, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_integration_connection_with_secret(text, text, text, text, text, text, text, text, text, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_integration_sync_job(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_integration_sync_error(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_due_odoo_sync_jobs() TO service_role;

-- Triggers
DROP TRIGGER IF EXISTS update_integration_connections_updated_at ON public.integration_connections;
CREATE TRIGGER update_integration_connections_updated_at BEFORE UPDATE ON public.integration_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_integration_connection_secrets_updated_at ON public.integration_connection_secrets;
CREATE TRIGGER update_integration_connection_secrets_updated_at BEFORE UPDATE ON public.integration_connection_secrets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_integration_sync_jobs_updated_at ON public.integration_sync_jobs;
CREATE TRIGGER update_integration_sync_jobs_updated_at BEFORE UPDATE ON public.integration_sync_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_integration_conflict_queue_updated_at ON public.integration_conflict_queue;
CREATE TRIGGER update_integration_conflict_queue_updated_at BEFORE UPDATE ON public.integration_conflict_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_integration_sync_errors_updated_at ON public.integration_sync_errors;
CREATE TRIGGER update_integration_sync_errors_updated_at BEFORE UPDATE ON public.integration_sync_errors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_contact_sync_dead_letters_updated_at ON public.contact_sync_dead_letters;
CREATE TRIGGER update_contact_sync_dead_letters_updated_at BEFORE UPDATE ON public.contact_sync_dead_letters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Role permissions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN
    INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
    VALUES ('admin'::app_role, 'integrations', true, true), ('operator'::app_role, 'integrations', false, false),
           ('viewer'::app_role, 'integrations', false, false), ('customer'::app_role, 'integrations', false, false)
    ON CONFLICT (role, feature) DO NOTHING;
  END IF;
END; $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';