-- ============================================================
-- Scotia eCom+ payment-gateway secret store
-- ------------------------------------------------------------
-- Replaces the (removed) Odoo integration settings as the admin-managed
-- credential store for the hosted payment page. Mirrors the proven
-- encrypted-secret pattern: non-secret config lives in a readable table; the
-- SharedSecret is encrypted at rest in a separate table that is never readable
-- from the client and only decryptable by the service role (the edge function).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Self-contained encryption key (independent of any Odoo objects). Reuses the
-- same GUC if present so existing key configuration keeps working.
CREATE OR REPLACE FUNCTION public.payment_secret_encryption_key()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE key_value text;
BEGIN
  key_value := current_setting('app.integration_secret_key', true);
  IF key_value IS NULL OR key_value = '' THEN
    key_value := 'payment-secret-fallback-v1';
  END IF;
  RETURN key_value;
END; $$;

-- ── Non-secret config (one row per tenant) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default' UNIQUE,
  provider text NOT NULL DEFAULT 'scotia',
  store_id text,
  environment text NOT NULL DEFAULT 'test',
  currency text NOT NULL DEFAULT '840',
  timezone text NOT NULL DEFAULT 'America/Barbados',
  enabled boolean NOT NULL DEFAULT false,
  has_secret boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_configured',
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_gateway_settings_env_check CHECK (environment IN ('test', 'production')),
  CONSTRAINT payment_gateway_settings_status_check CHECK (status IN ('not_configured', 'connected', 'error'))
);

ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read payment_gateway_settings" ON public.payment_gateway_settings;
CREATE POLICY "Admins can read payment_gateway_settings"
  ON public.payment_gateway_settings FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Writes go exclusively through the SECURITY DEFINER RPC below.
DROP POLICY IF EXISTS "No direct writes to payment_gateway_settings" ON public.payment_gateway_settings;
CREATE POLICY "No direct writes to payment_gateway_settings"
  ON public.payment_gateway_settings FOR ALL
  TO authenticated
  USING (false) WITH CHECK (false);

DROP TRIGGER IF EXISTS update_payment_gateway_settings_updated_at ON public.payment_gateway_settings;
CREATE TRIGGER update_payment_gateway_settings_updated_at
  BEFORE UPDATE ON public.payment_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Encrypted secret (SharedSecret) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_gateway_secrets (
  settings_id uuid PRIMARY KEY REFERENCES public.payment_gateway_settings(id) ON DELETE CASCADE,
  encrypted_secret bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateway_secrets ENABLE ROW LEVEL SECURITY;

-- Never readable/writable directly — only via SECURITY DEFINER functions.
DROP POLICY IF EXISTS "No direct access to payment_gateway_secrets" ON public.payment_gateway_secrets;
CREATE POLICY "No direct access to payment_gateway_secrets"
  ON public.payment_gateway_secrets FOR ALL
  USING (false) WITH CHECK (false);

-- ── Admin upsert (encrypts the secret when provided) ───────────────────────
CREATE OR REPLACE FUNCTION public.upsert_payment_gateway_settings(
  p_store_id text,
  p_environment text DEFAULT 'test',
  p_currency text DEFAULT '840',
  p_timezone text DEFAULT 'America/Barbados',
  p_enabled boolean DEFAULT false,
  p_shared_secret text DEFAULT NULL,
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
  v_has_secret boolean;
BEGIN
  IF NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'Only admins can update payment gateway settings.';
  END IF;

  INSERT INTO public.payment_gateway_settings (
    tenant_key, provider, store_id, environment, currency, timezone, enabled, status
  )
  VALUES (
    'default', 'scotia', NULLIF(BTRIM(p_store_id), ''), p_environment, p_currency, p_timezone, p_enabled,
    'not_configured'
  )
  ON CONFLICT (tenant_key) DO UPDATE SET
    store_id = NULLIF(BTRIM(p_store_id), ''),
    environment = p_environment,
    currency = p_currency,
    timezone = p_timezone,
    enabled = p_enabled,
    updated_at = now()
  RETURNING id INTO v_settings_id;

  -- Store / rotate the secret only when a non-empty value is supplied.
  IF p_shared_secret IS NOT NULL AND BTRIM(p_shared_secret) <> '' THEN
    INSERT INTO public.payment_gateway_secrets (settings_id, encrypted_secret, updated_at)
    VALUES (
      v_settings_id,
      extensions.pgp_sym_encrypt(p_shared_secret, public.payment_secret_encryption_key()),
      now()
    )
    ON CONFLICT (settings_id) DO UPDATE
      SET encrypted_secret = EXCLUDED.encrypted_secret, updated_at = now();
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.payment_gateway_secrets WHERE settings_id = v_settings_id)
    INTO v_has_secret;

  UPDATE public.payment_gateway_settings
  SET has_secret = v_has_secret,
      status = CASE
        WHEN store_id IS NOT NULL AND v_has_secret THEN 'connected'
        ELSE 'not_configured'
      END,
      updated_at = now()
  WHERE id = v_settings_id;

  RETURN v_settings_id;
END; $$;

-- ── Service-role credential fetch (decrypts; edge function only) ────────────
CREATE OR REPLACE FUNCTION public.get_scotia_credentials()
RETURNS TABLE (
  store_id text,
  shared_secret text,
  environment text,
  currency text,
  timezone text,
  enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    s.store_id,
    extensions.pgp_sym_decrypt(sec.encrypted_secret, public.payment_secret_encryption_key())::text,
    s.environment,
    s.currency,
    s.timezone,
    s.enabled
  FROM public.payment_gateway_settings s
  LEFT JOIN public.payment_gateway_secrets sec ON sec.settings_id = s.id
  WHERE s.tenant_key = 'default' AND s.provider = 'scotia'
  LIMIT 1;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.upsert_payment_gateway_settings(text, text, text, text, boolean, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_scotia_credentials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scotia_credentials() TO service_role;
