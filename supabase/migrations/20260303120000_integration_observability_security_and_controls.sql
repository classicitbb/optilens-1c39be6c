-- Integration observability + security hardening

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

CREATE INDEX IF NOT EXISTS idx_integration_audit_events_connection_created
  ON public.integration_audit_events(integration_connection_id, created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_integration_structured_logs_tenant_provider_created
  ON public.integration_structured_logs(tenant_key, provider, created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_integration_conflict_queue_status
  ON public.integration_conflict_queue(tenant_key, provider, resolution_status, created_at DESC);

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
    CASE
      WHEN records_processed <= 0 THEN 0
      ELSE ROUND(records_failed::numeric / GREATEST(records_processed, 1), 4)
    END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_run_metrics_connection_started
  ON public.integration_sync_run_metrics(integration_connection_id, run_started_at DESC);

CREATE OR REPLACE VIEW public.integration_health_metrics_dashboard AS
SELECT
  c.id AS integration_connection_id,
  c.tenant_key,
  c.provider,
  MAX(CASE WHEN m.success THEN m.run_completed_at END) AS last_successful_run_at,
  COALESCE(MAX(m.source_lag_seconds), 0) AS lag_behind_source_seconds,
  COALESCE(ROUND(AVG(m.error_rate), 4), 0) AS error_rate,
  COALESCE(ROUND(AVG(m.records_processed), 2), 0) AS records_processed_per_run
FROM public.integration_connections c
LEFT JOIN public.integration_sync_run_metrics m
  ON m.integration_connection_id = c.id
GROUP BY c.id, c.tenant_key, c.provider;

ALTER TABLE public.integration_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_structured_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_conflict_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_run_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage integration_connection_secrets" ON public.integration_connection_secrets;

CREATE POLICY "No direct access to integration_connection_secrets"
  ON public.integration_connection_secrets FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Admins can manage integration_audit_events"
  ON public.integration_audit_events FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage integration_structured_logs"
  ON public.integration_structured_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage integration_conflict_queue"
  ON public.integration_conflict_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage integration_sync_run_metrics"
  ON public.integration_sync_run_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.redact_pii_jsonb(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
BEGIN
  IF p_payload IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  IF jsonb_typeof(p_payload) = 'array' THEN
    RETURN (
      SELECT jsonb_agg(public.redact_pii_jsonb(elem))
      FROM jsonb_array_elements(p_payload) elem
    );
  END IF;

  IF jsonb_typeof(p_payload) <> 'object' THEN
    RETURN p_payload;
  END IF;

  FOR v_key, v_val IN SELECT key, value FROM jsonb_each(p_payload)
  LOOP
    IF v_key ~* '(password|secret|token|credential|authorization|api[_-]?key|ssn|tax_id|vat|email|phone)' THEN
      v_result := v_result || jsonb_build_object(v_key, '[REDACTED]');
    ELSE
      v_result := v_result || jsonb_build_object(v_key, public.redact_pii_jsonb(v_val));
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_integration_event(
  p_integration_connection_id uuid,
  p_tenant_key text,
  p_provider text,
  p_log_level text,
  p_event_name text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.integration_structured_logs (
    integration_connection_id,
    tenant_key,
    provider,
    log_level,
    event_name,
    payload,
    redacted_payload
  )
  VALUES (
    p_integration_connection_id,
    COALESCE(NULLIF(p_tenant_key, ''), 'default'),
    p_provider,
    p_log_level,
    p_event_name,
    COALESCE(p_payload, '{}'::jsonb),
    public.redact_pii_jsonb(COALESCE(p_payload, '{}'::jsonb))
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_integration_connection_with_secret(
  p_tenant_key text,
  p_provider text,
  p_environment text,
  p_base_url text,
  p_database_name text,
  p_user_identifier text,
  p_auth_mode text,
  p_sync_direction text,
  p_conflict_policy text,
  p_incremental_enabled boolean,
  p_dry_run_enabled boolean,
  p_credential_value text,
  p_test_connection boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection_id uuid;
  v_previous_conflict_policy text;
  v_tenant_key text := COALESCE(NULLIF(p_tenant_key, ''), 'default');
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage integration credentials.';
  END IF;

  SELECT conflict_policy INTO v_previous_conflict_policy
  FROM public.integration_connections
  WHERE tenant_key = v_tenant_key
    AND provider = p_provider;

  INSERT INTO public.integration_connections (
    tenant_key,
    provider,
    environment,
    base_url,
    database_name,
    user_identifier,
    auth_mode,
    sync_direction,
    conflict_policy,
    incremental_enabled,
    dry_run_enabled,
    status,
    last_health_check_at
  )
  VALUES (
    v_tenant_key,
    p_provider,
    p_environment,
    p_base_url,
    p_database_name,
    p_user_identifier,
    p_auth_mode,
    p_sync_direction,
    p_conflict_policy,
    p_incremental_enabled,
    p_dry_run_enabled,
    CASE WHEN p_test_connection THEN 'connected' ELSE 'not_configured' END,
    CASE WHEN p_test_connection THEN now() ELSE NULL END
  )
  ON CONFLICT (tenant_key, provider)
  DO UPDATE SET
    environment = EXCLUDED.environment,
    base_url = EXCLUDED.base_url,
    database_name = EXCLUDED.database_name,
    user_identifier = EXCLUDED.user_identifier,
    auth_mode = EXCLUDED.auth_mode,
    sync_direction = EXCLUDED.sync_direction,
    conflict_policy = EXCLUDED.conflict_policy,
    incremental_enabled = EXCLUDED.incremental_enabled,
    dry_run_enabled = EXCLUDED.dry_run_enabled,
    status = CASE WHEN p_test_connection THEN 'connected' ELSE public.integration_connections.status END,
    last_health_check_at = CASE WHEN p_test_connection THEN now() ELSE public.integration_connections.last_health_check_at END,
    updated_at = now()
  RETURNING id INTO v_connection_id;

  IF p_credential_value IS NOT NULL AND p_credential_value <> '' THEN
    INSERT INTO public.integration_connection_secrets (
      integration_connection_id,
      encrypted_secret,
      updated_at
    )
    VALUES (
      v_connection_id,
      pgp_sym_encrypt(p_credential_value, public.integration_secret_encryption_key()),
      now()
    )
    ON CONFLICT (integration_connection_id)
    DO UPDATE SET
      encrypted_secret = EXCLUDED.encrypted_secret,
      updated_at = now();

    INSERT INTO public.integration_audit_events (
      integration_connection_id,
      tenant_key,
      provider,
      event_type,
      actor_user_id,
      event_payload
    ) VALUES (
      v_connection_id,
      v_tenant_key,
      p_provider,
      'credentials_changed',
      auth.uid(),
      jsonb_build_object('auth_mode', p_auth_mode, 'key_rotated', true)
    );
  END IF;

  IF p_test_connection THEN
    INSERT INTO public.integration_audit_events (
      integration_connection_id,
      tenant_key,
      provider,
      event_type,
      actor_user_id,
      event_payload
    ) VALUES (
      v_connection_id,
      v_tenant_key,
      p_provider,
      'connection_tested',
      auth.uid(),
      jsonb_build_object('status', 'connected')
    );
  END IF;

  IF v_previous_conflict_policy IS DISTINCT FROM p_conflict_policy THEN
    INSERT INTO public.integration_audit_events (
      integration_connection_id,
      tenant_key,
      provider,
      event_type,
      actor_user_id,
      event_payload
    ) VALUES (
      v_connection_id,
      v_tenant_key,
      p_provider,
      'conflict_policy_overridden',
      auth.uid(),
      jsonb_build_object('from', v_previous_conflict_policy, 'to', p_conflict_policy)
    );
  END IF;

  PERFORM public.log_integration_event(
    v_connection_id,
    v_tenant_key,
    p_provider,
    'info',
    'integration_configuration_upserted',
    jsonb_build_object(
      'test_connection', p_test_connection,
      'auth_mode', p_auth_mode,
      'conflict_policy', p_conflict_policy,
      'credential_supplied', p_credential_value IS NOT NULL AND p_credential_value <> ''
    )
  );

  RETURN v_connection_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_integration_sync_job(
  p_tenant_key text,
  p_provider text,
  p_sync_kind text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection_id uuid;
  v_job_id uuid;
  v_tenant_key text := COALESCE(NULLIF(p_tenant_key, ''), 'default');
  v_lock_key bigint;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can trigger integration sync jobs.';
  END IF;

  v_lock_key := hashtextextended(v_tenant_key || ':' || p_provider, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT id INTO v_connection_id
  FROM public.integration_connections
  WHERE tenant_key = v_tenant_key
    AND provider = p_provider;

  IF v_connection_id IS NULL THEN
    RAISE EXCEPTION 'Integration is not configured for this tenant/provider.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.integration_sync_jobs
    WHERE integration_connection_id = v_connection_id
      AND status IN ('queued', 'running')
  ) THEN
    RAISE EXCEPTION 'A sync run is already queued or running for this tenant/provider.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.integration_sync_jobs
    WHERE integration_connection_id = v_connection_id
      AND requested_at >= now() - interval '60 seconds'
  ) THEN
    RAISE EXCEPTION 'Sync trigger rate-limited. Please wait before retrying.';
  END IF;

  INSERT INTO public.integration_sync_jobs (
    integration_connection_id,
    tenant_key,
    provider,
    sync_kind,
    requested_by,
    status
  )
  VALUES (
    v_connection_id,
    v_tenant_key,
    p_provider,
    p_sync_kind,
    auth.uid(),
    'queued'
  )
  RETURNING id INTO v_job_id;

  UPDATE public.integration_connections
  SET
    retry_state = 'queued',
    updated_at = now()
  WHERE id = v_connection_id;

  INSERT INTO public.integration_audit_events (
    integration_connection_id,
    tenant_key,
    provider,
    event_type,
    actor_user_id,
    event_payload
  ) VALUES (
    v_connection_id,
    v_tenant_key,
    p_provider,
    'manual_sync_triggered',
    auth.uid(),
    jsonb_build_object('sync_kind', p_sync_kind, 'sync_job_id', v_job_id)
  );

  PERFORM public.log_integration_event(
    v_connection_id,
    v_tenant_key,
    p_provider,
    'info',
    'manual_sync_triggered',
    jsonb_build_object('sync_kind', p_sync_kind, 'sync_job_id', v_job_id)
  );

  RETURN v_job_id;
END;
$$;

GRANT SELECT ON public.integration_health_metrics_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_integration_event(uuid, text, text, text, text, jsonb) TO authenticated;

CREATE TRIGGER update_integration_conflict_queue_updated_at
  BEFORE UPDATE ON public.integration_conflict_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
