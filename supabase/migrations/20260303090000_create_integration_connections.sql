CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  provider text NOT NULL CHECK (provider = 'odoo'),
  environment text NOT NULL,
  base_url text NOT NULL,
  database_name text NOT NULL,
  user_identifier text,
  auth_mode text NOT NULL CHECK (auth_mode IN ('api_key', 'password')),
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
  conflict_policy text NOT NULL DEFAULT 'prefer_odoo' CHECK (conflict_policy IN ('prefer_odoo', 'prefer_optilens', 'manual_review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_key, provider)
);

CREATE TABLE public.integration_connection_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  key_version integer NOT NULL DEFAULT 1,
  encrypted_secret bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_connection_id)
);

CREATE TABLE public.integration_sync_jobs (
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

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connection_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integration_connections"
  ON public.integration_connections FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage integration_connection_secrets"
  ON public.integration_connection_secrets FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage integration_sync_jobs"
  ON public.integration_sync_jobs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.integration_secret_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_value text;
BEGIN
  key_value := current_setting('app.integration_secret_key', true);
  IF key_value IS NULL OR key_value = '' THEN
    RAISE EXCEPTION 'Missing app.integration_secret_key database setting.';
  END IF;
  RETURN key_value;
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
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage integration credentials.';
  END IF;

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
    COALESCE(NULLIF(p_tenant_key, ''), 'default'),
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
  END IF;

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
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can trigger integration sync jobs.';
  END IF;

  SELECT id INTO v_connection_id
  FROM public.integration_connections
  WHERE tenant_key = COALESCE(NULLIF(p_tenant_key, ''), 'default')
    AND provider = p_provider;

  IF v_connection_id IS NULL THEN
    RAISE EXCEPTION 'Integration is not configured for this tenant/provider.';
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
    COALESCE(NULLIF(p_tenant_key, ''), 'default'),
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

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_integration_connection_with_secret(
  text, text, text, text, text, text, text, text, text, boolean, boolean, text, boolean
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.trigger_integration_sync_job(text, text, text) TO authenticated;

CREATE TRIGGER update_integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_connection_secrets_updated_at
  BEFORE UPDATE ON public.integration_connection_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_sync_jobs_updated_at
  BEFORE UPDATE ON public.integration_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
VALUES
  ('admin'::app_role, 'integrations', true, true),
  ('operator'::app_role, 'integrations', false, false),
  ('viewer'::app_role, 'integrations', false, false),
  ('customer'::app_role, 'integrations', false, false)
ON CONFLICT (role, feature) DO NOTHING;
