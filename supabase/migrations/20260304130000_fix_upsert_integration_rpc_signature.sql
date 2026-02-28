-- Fix RPC signature mismatches for integration upsert in PostgREST schema cache

CREATE OR REPLACE FUNCTION public.upsert_integration_connection(
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

-- Keep backward compatibility for existing clients
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.upsert_integration_connection(
    p_tenant_key,
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
    p_credential_value,
    p_test_connection
  );
$$;

GRANT EXECUTE ON FUNCTION public.upsert_integration_connection(
  text, text, text, text, text, text, text, text, text, boolean, boolean, text, boolean
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_integration_connection_with_secret(
  text, text, text, text, text, text, text, text, text, boolean, boolean, text, boolean
) TO authenticated;
