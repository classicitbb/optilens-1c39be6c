-- DHL Express MyDHL API credentials. The browser can read only non-secret
-- status/configuration; Basic Auth credentials remain encrypted at rest and
-- are available exclusively to service-role Edge Functions.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.dhl_express_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default' UNIQUE,
  account_number text,
  environment text NOT NULL DEFAULT 'test',
  enabled boolean NOT NULL DEFAULT false,
  has_credentials boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_configured',
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dhl_express_settings_environment_check CHECK (environment IN ('test', 'production')),
  CONSTRAINT dhl_express_settings_status_check CHECK (status IN ('not_configured', 'connected', 'error'))
);

ALTER TABLE public.dhl_express_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read DHL Express settings"
  ON public.dhl_express_settings FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

CREATE POLICY "No direct DHL Express settings writes"
  ON public.dhl_express_settings FOR ALL
  TO authenticated
  USING (false) WITH CHECK (false);

CREATE TRIGGER update_dhl_express_settings_updated_at
  BEFORE UPDATE ON public.dhl_express_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dhl_express_secrets (
  settings_id uuid PRIMARY KEY REFERENCES public.dhl_express_settings(id) ON DELETE CASCADE,
  encrypted_username bytea NOT NULL,
  encrypted_password bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dhl_express_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct DHL Express secret access"
  ON public.dhl_express_secrets FOR ALL
  USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.upsert_dhl_express_settings(
  p_account_number text,
  p_environment text DEFAULT 'test',
  p_enabled boolean DEFAULT false,
  p_api_username text DEFAULT NULL,
  p_api_password text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
  v_settings_id uuid;
  v_has_credentials boolean;
BEGIN
  IF NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'Only admins can update DHL Express settings.';
  END IF;

  IF p_environment NOT IN ('test', 'production') THEN
    RAISE EXCEPTION 'DHL Express environment must be test or production.';
  END IF;

  INSERT INTO public.dhl_express_settings (tenant_key, account_number, environment, enabled, status, last_error)
  VALUES ('default', NULLIF(BTRIM(p_account_number), ''), p_environment, p_enabled, 'not_configured', NULL)
  ON CONFLICT (tenant_key) DO UPDATE SET
    account_number = EXCLUDED.account_number,
    environment = EXCLUDED.environment,
    enabled = EXCLUDED.enabled,
    status = CASE WHEN dhl_express_settings.has_credentials THEN dhl_express_settings.status ELSE 'not_configured' END,
    last_error = CASE WHEN dhl_express_settings.has_credentials THEN dhl_express_settings.last_error ELSE NULL END,
    updated_at = now()
  RETURNING id INTO v_settings_id;

  IF p_api_username IS NOT NULL AND BTRIM(p_api_username) <> ''
     AND p_api_password IS NOT NULL AND BTRIM(p_api_password) <> '' THEN
    INSERT INTO public.dhl_express_secrets (settings_id, encrypted_username, encrypted_password, updated_at)
    VALUES (
      v_settings_id,
      extensions.pgp_sym_encrypt(p_api_username, public.payment_secret_encryption_key()),
      extensions.pgp_sym_encrypt(p_api_password, public.payment_secret_encryption_key()),
      now()
    )
    ON CONFLICT (settings_id) DO UPDATE SET
      encrypted_username = EXCLUDED.encrypted_username,
      encrypted_password = EXCLUDED.encrypted_password,
      updated_at = now();
  ELSIF (p_api_username IS NOT NULL AND BTRIM(p_api_username) <> '')
     OR (p_api_password IS NOT NULL AND BTRIM(p_api_password) <> '') THEN
    RAISE EXCEPTION 'Enter both the DHL API username and password to rotate credentials.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.dhl_express_secrets WHERE settings_id = v_settings_id)
  INTO v_has_credentials;

  UPDATE public.dhl_express_settings
  SET has_credentials = v_has_credentials,
      status = CASE
        WHEN account_number IS NOT NULL AND v_has_credentials THEN 'not_configured'
        ELSE 'not_configured'
      END,
      last_error = NULL,
      updated_at = now()
  WHERE id = v_settings_id;

  RETURN v_settings_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dhl_express_credentials()
RETURNS TABLE (
  account_number text,
  api_username text,
  api_password text,
  environment text,
  enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    s.account_number,
    extensions.pgp_sym_decrypt(sec.encrypted_username, public.payment_secret_encryption_key())::text,
    extensions.pgp_sym_decrypt(sec.encrypted_password, public.payment_secret_encryption_key())::text,
    s.environment,
    s.enabled
  FROM public.dhl_express_settings s
  JOIN public.dhl_express_secrets sec ON sec.settings_id = s.id
  WHERE s.tenant_key = 'default'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.record_dhl_express_test(
  p_success boolean,
  p_error_message text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
BEGIN
  IF NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'Only admins can record DHL Express test results.';
  END IF;

  UPDATE public.dhl_express_settings
  SET status = CASE WHEN p_success THEN 'connected' ELSE 'error' END,
      last_tested_at = now(),
      last_error = CASE WHEN p_success THEN NULL ELSE LEFT(NULLIF(BTRIM(p_error_message), ''), 500) END,
      updated_at = now()
  WHERE tenant_key = 'default';
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_dhl_express_settings(text, text, boolean, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_dhl_express_settings(text, text, boolean, text, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dhl_express_credentials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dhl_express_credentials() TO service_role;

REVOKE ALL ON FUNCTION public.record_dhl_express_test(boolean, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_dhl_express_test(boolean, text, uuid) TO service_role;
