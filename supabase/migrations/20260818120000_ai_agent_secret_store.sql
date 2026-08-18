-- ============================================================
-- AI Agents (Anthropic) credential store
-- ------------------------------------------------------------
-- Lets an admin manage the Portal Copilot's Claude API key from
-- /admin/settings/integrations instead of a Supabase Edge Function
-- secret. Mirrors the encrypted-secret pattern already used for the
-- Scotia payment gateway and DHL Express: non-secret config lives in
-- a readable table; the API key is encrypted at rest in a separate
-- table that is never readable from the client and only decryptable
-- by the service role (the portal-copilot edge function).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── Non-secret config (one row per tenant) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default' UNIQUE,
  provider text NOT NULL DEFAULT 'anthropic',
  model text,
  enabled boolean NOT NULL DEFAULT false,
  has_secret boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_configured',
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_agent_settings_provider_check CHECK (provider = 'anthropic'),
  CONSTRAINT ai_agent_settings_status_check CHECK (status IN ('not_configured', 'connected', 'error'))
);

ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ai_agent_settings" ON public.ai_agent_settings;
CREATE POLICY "Admins can read ai_agent_settings"
  ON public.ai_agent_settings FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

-- Writes go exclusively through the SECURITY DEFINER RPC below.
DROP POLICY IF EXISTS "No direct writes to ai_agent_settings" ON public.ai_agent_settings;
CREATE POLICY "No direct writes to ai_agent_settings"
  ON public.ai_agent_settings FOR ALL
  TO authenticated
  USING (false) WITH CHECK (false);

DROP TRIGGER IF EXISTS update_ai_agent_settings_updated_at ON public.ai_agent_settings;
CREATE TRIGGER update_ai_agent_settings_updated_at
  BEFORE UPDATE ON public.ai_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Encrypted secret (Anthropic API key) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_secrets (
  settings_id uuid PRIMARY KEY REFERENCES public.ai_agent_settings(id) ON DELETE CASCADE,
  encrypted_secret bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_agent_secrets ENABLE ROW LEVEL SECURITY;

-- Never readable/writable directly — only via SECURITY DEFINER functions.
DROP POLICY IF EXISTS "No direct access to ai_agent_secrets" ON public.ai_agent_secrets;
CREATE POLICY "No direct access to ai_agent_secrets"
  ON public.ai_agent_secrets FOR ALL
  USING (false) WITH CHECK (false);

-- ── Admin upsert (encrypts the API key when provided) ───────────────────────
CREATE OR REPLACE FUNCTION public.upsert_ai_agent_settings(
  p_model text DEFAULT NULL,
  p_enabled boolean DEFAULT false,
  p_api_key text DEFAULT NULL,
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
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Only admins can update AI agent settings.';
  END IF;

  INSERT INTO public.ai_agent_settings (
    tenant_key, provider, model, enabled, status
  )
  VALUES (
    'default', 'anthropic', NULLIF(BTRIM(p_model), ''), p_enabled, 'not_configured'
  )
  ON CONFLICT (tenant_key) DO UPDATE SET
    model = NULLIF(BTRIM(p_model), ''),
    enabled = p_enabled,
    updated_at = now()
  RETURNING id INTO v_settings_id;

  -- Store / rotate the API key only when a non-empty value is supplied.
  IF p_api_key IS NOT NULL AND BTRIM(p_api_key) <> '' THEN
    INSERT INTO public.ai_agent_secrets (settings_id, encrypted_secret, updated_at)
    VALUES (
      v_settings_id,
      extensions.pgp_sym_encrypt(p_api_key, public.payment_secret_encryption_key()),
      now()
    )
    ON CONFLICT (settings_id) DO UPDATE
      SET encrypted_secret = EXCLUDED.encrypted_secret, updated_at = now();
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.ai_agent_secrets WHERE settings_id = v_settings_id)
    INTO v_has_secret;

  UPDATE public.ai_agent_settings
  SET has_secret = v_has_secret,
      status = CASE
        WHEN v_has_secret AND p_enabled THEN 'connected'
        ELSE 'not_configured'
      END,
      updated_at = now()
  WHERE id = v_settings_id;

  RETURN v_settings_id;
END; $$;

-- ── Service-role credential fetch (decrypts; edge function only) ───────────
CREATE OR REPLACE FUNCTION public.get_ai_agent_credentials()
RETURNS TABLE (
  model text,
  api_key text,
  enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    s.model,
    extensions.pgp_sym_decrypt(sec.encrypted_secret, public.payment_secret_encryption_key())::text,
    s.enabled
  FROM public.ai_agent_settings s
  LEFT JOIN public.ai_agent_secrets sec ON sec.settings_id = s.id
  WHERE s.tenant_key = 'default' AND s.provider = 'anthropic'
  LIMIT 1;
$$;

-- ── Record test outcome (used by the "Test configuration" button) ──────────
CREATE OR REPLACE FUNCTION public.record_ai_agent_test(
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
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Only admins can record AI agent test results.';
  END IF;

  UPDATE public.ai_agent_settings
  SET
    status = CASE WHEN p_success THEN 'connected' ELSE 'error' END,
    last_error = NULLIF(BTRIM(COALESCE(p_error_message, '')), ''),
    last_tested_at = now(),
    updated_at = now()
  WHERE tenant_key = 'default' AND provider = 'anthropic';
END;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.upsert_ai_agent_settings(text, boolean, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_ai_agent_credentials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_agent_credentials() TO service_role;

REVOKE ALL ON FUNCTION public.record_ai_agent_test(boolean, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ai_agent_test(boolean, text, uuid) TO authenticated;
