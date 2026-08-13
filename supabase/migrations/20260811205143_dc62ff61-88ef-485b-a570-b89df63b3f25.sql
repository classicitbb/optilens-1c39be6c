CREATE OR REPLACE FUNCTION public.store_gatekeeper_connection(
  p_environment text,
  p_origin_lab_id text,
  p_lab_name text,
  p_jwt_key text,
  p_jwt_secret text,
  p_auth_token text,
  p_contracts jsonb,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
  v_settings_id uuid;
  v_contract jsonb;
  v_contract_id uuid;
  v_active_receiver_lab_id text;
  v_active_receiver_retailer_name text;
BEGIN
  IF NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'Only admins can connect Gatekeeper.';
  END IF;
  IF p_environment NOT IN ('staging', 'production') THEN
    RAISE EXCEPTION 'Gatekeeper environment must be staging or production.';
  END IF;
  IF NULLIF(BTRIM(p_origin_lab_id), '') IS NULL OR NULLIF(BTRIM(p_lab_name), '') IS NULL
     OR NULLIF(BTRIM(p_jwt_key), '') IS NULL OR NULLIF(BTRIM(p_jwt_secret), '') IS NULL
     OR NULLIF(BTRIM(p_auth_token), '') IS NULL THEN
    RAISE EXCEPTION 'Gatekeeper returned incomplete credentials.';
  END IF;

  INSERT INTO public.gatekeeper_settings (
    tenant_key, environment, origin_lab_id, lab_name, has_credentials,
    status, last_connected_at, last_auth_refresh_at, last_error
  ) VALUES (
    'default', p_environment, BTRIM(p_origin_lab_id), BTRIM(p_lab_name), true,
    'connected', now(), now(), NULL
  )
  ON CONFLICT (tenant_key) DO UPDATE SET
    environment = EXCLUDED.environment,
    origin_lab_id = EXCLUDED.origin_lab_id,
    lab_name = EXCLUDED.lab_name,
    has_credentials = true,
    status = 'connected',
    last_connected_at = now(),
    last_auth_refresh_at = now(),
    last_error = NULL,
    updated_at = now()
  RETURNING id INTO v_settings_id;

  INSERT INTO public.gatekeeper_secrets (
    settings_id, encrypted_jwt_key, encrypted_jwt_secret, encrypted_auth_token,
    auth_token_expires_at, updated_at
  ) VALUES (
    v_settings_id,
    extensions.pgp_sym_encrypt(p_jwt_key, public.payment_secret_encryption_key()),
    extensions.pgp_sym_encrypt(p_jwt_secret, public.payment_secret_encryption_key()),
    extensions.pgp_sym_encrypt(p_auth_token, public.payment_secret_encryption_key()),
    now() + interval '23 hours', now()
  ) ON CONFLICT (settings_id) DO UPDATE SET
    encrypted_jwt_key = EXCLUDED.encrypted_jwt_key,
    encrypted_jwt_secret = EXCLUDED.encrypted_jwt_secret,
    encrypted_auth_token = EXCLUDED.encrypted_auth_token,
    auth_token_expires_at = EXCLUDED.auth_token_expires_at,
    updated_at = now();

  SELECT receiver_lab_id, receiver_retailer_name
  INTO v_active_receiver_lab_id, v_active_receiver_retailer_name
  FROM public.gatekeeper_contracts
  WHERE settings_id = v_settings_id AND is_active;

  DELETE FROM public.gatekeeper_contracts WHERE settings_id = v_settings_id;
  FOR v_contract IN SELECT value FROM jsonb_array_elements(COALESCE(p_contracts, '[]'::jsonb))
  LOOP
    IF NULLIF(BTRIM(v_contract ->> 'hash_routing'), '') IS NULL
       OR NULLIF(BTRIM(v_contract ->> 'webrx_lab_id_receiver'), '') IS NULL
       OR NULLIF(BTRIM(v_contract ->> 'webrx_retailer_name_receiver'), '') IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO public.gatekeeper_contracts (
      settings_id, origin_lab_id, origin_retailer_name, receiver_lab_id,
      receiver_retailer_name, origin_type, receiver_type, is_active
    ) VALUES (
      v_settings_id,
      COALESCE(NULLIF(BTRIM(v_contract ->> 'webrx_lab_id_origin'), ''), BTRIM(p_origin_lab_id)),
      COALESCE(NULLIF(BTRIM(v_contract ->> 'webrx_retailer_name_origin'), ''), BTRIM(p_lab_name)),
      BTRIM(v_contract ->> 'webrx_lab_id_receiver'),
      BTRIM(v_contract ->> 'webrx_retailer_name_receiver'),
      NULLIF(BTRIM(v_contract ->> 'origin_type'), ''),
      NULLIF(BTRIM(v_contract ->> 'receiver_type'), ''),
      COALESCE(
        BTRIM(v_contract ->> 'webrx_lab_id_receiver') = v_active_receiver_lab_id
          AND BTRIM(v_contract ->> 'webrx_retailer_name_receiver') = v_active_receiver_retailer_name,
        false
      )
    ) RETURNING id INTO v_contract_id;
    INSERT INTO public.gatekeeper_contract_secrets (contract_id, encrypted_hash_routing)
    VALUES (v_contract_id, extensions.pgp_sym_encrypt(v_contract ->> 'hash_routing', public.payment_secret_encryption_key()));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_gatekeeper_contracts(
  p_contracts jsonb,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
  v_settings_id uuid;
  v_origin_lab_id text;
  v_lab_name text;
  v_contract jsonb;
  v_contract_id uuid;
  v_active_receiver_lab_id text;
  v_active_receiver_retailer_name text;
BEGIN
  IF NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'Only admins can refresh Gatekeeper contracts.';
  END IF;
  SELECT id, origin_lab_id, lab_name INTO v_settings_id, v_origin_lab_id, v_lab_name
  FROM public.gatekeeper_settings WHERE tenant_key = 'default';
  IF NOT FOUND THEN RAISE EXCEPTION 'Gatekeeper is not connected.'; END IF;

  SELECT receiver_lab_id, receiver_retailer_name
  INTO v_active_receiver_lab_id, v_active_receiver_retailer_name
  FROM public.gatekeeper_contracts
  WHERE settings_id = v_settings_id AND is_active;
  DELETE FROM public.gatekeeper_contracts WHERE settings_id = v_settings_id;

  FOR v_contract IN SELECT value FROM jsonb_array_elements(COALESCE(p_contracts, '[]'::jsonb))
  LOOP
    IF NULLIF(BTRIM(v_contract ->> 'hash_routing'), '') IS NULL
       OR NULLIF(BTRIM(v_contract ->> 'webrx_lab_id_receiver'), '') IS NULL
       OR NULLIF(BTRIM(v_contract ->> 'webrx_retailer_name_receiver'), '') IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO public.gatekeeper_contracts (
      settings_id, origin_lab_id, origin_retailer_name, receiver_lab_id,
      receiver_retailer_name, origin_type, receiver_type, is_active
    ) VALUES (
      v_settings_id,
      COALESCE(NULLIF(BTRIM(v_contract ->> 'webrx_lab_id_origin'), ''), v_origin_lab_id),
      COALESCE(NULLIF(BTRIM(v_contract ->> 'webrx_retailer_name_origin'), ''), v_lab_name),
      BTRIM(v_contract ->> 'webrx_lab_id_receiver'),
      BTRIM(v_contract ->> 'webrx_retailer_name_receiver'),
      NULLIF(BTRIM(v_contract ->> 'origin_type'), ''),
      NULLIF(BTRIM(v_contract ->> 'receiver_type'), ''),
      COALESCE(
        BTRIM(v_contract ->> 'webrx_lab_id_receiver') = v_active_receiver_lab_id
          AND BTRIM(v_contract ->> 'webrx_retailer_name_receiver') = v_active_receiver_retailer_name,
        false
      )
    ) RETURNING id INTO v_contract_id;
    INSERT INTO public.gatekeeper_contract_secrets (contract_id, encrypted_hash_routing)
    VALUES (v_contract_id, extensions.pgp_sym_encrypt(v_contract ->> 'hash_routing', public.payment_secret_encryption_key()));
  END LOOP;
END;
$$;