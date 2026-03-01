-- Add overloads so PostgREST can resolve RPC calls even when p_test_connection is omitted

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
  p_credential_value text
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
    false
  );
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
  p_credential_value text
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.upsert_integration_connection_with_secret(
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
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.upsert_integration_connection(
  text, text, text, text, text, text, text, text, text, boolean, boolean, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_integration_connection_with_secret(
  text, text, text, text, text, text, text, text, text, boolean, boolean, text
) TO authenticated;
