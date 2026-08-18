-- Multi-provider upgrade for the AI agent credential store
ALTER TABLE public.ai_agent_settings ALTER COLUMN provider DROP DEFAULT;
ALTER TABLE public.ai_agent_settings DROP CONSTRAINT IF EXISTS ai_agent_settings_provider_check;
ALTER TABLE public.ai_agent_settings DROP CONSTRAINT IF EXISTS ai_agent_settings_provider_format_check;
ALTER TABLE public.ai_agent_settings
  ADD CONSTRAINT ai_agent_settings_provider_format_check
  CHECK (provider ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

ALTER TABLE public.ai_agent_settings DROP CONSTRAINT IF EXISTS ai_agent_settings_status_check;
ALTER TABLE public.ai_agent_settings
  ADD CONSTRAINT ai_agent_settings_status_check
  CHECK (status IN ('not_configured', 'connected', 'unverified', 'error'));

ALTER TABLE public.ai_agent_settings DROP CONSTRAINT IF EXISTS ai_agent_settings_tenant_key_key;
ALTER TABLE public.ai_agent_settings DROP CONSTRAINT IF EXISTS ai_agent_settings_tenant_provider_key;
ALTER TABLE public.ai_agent_settings
  ADD CONSTRAINT ai_agent_settings_tenant_provider_key UNIQUE (tenant_key, provider);

DROP FUNCTION IF EXISTS public.upsert_ai_agent_settings(text, boolean, text, uuid);
DROP FUNCTION IF EXISTS public.record_ai_agent_test(boolean, text, uuid);
DROP FUNCTION IF EXISTS public.get_ai_agent_credentials();

CREATE OR REPLACE FUNCTION public.upsert_ai_agent_settings(
  p_provider text,
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
  v_provider text := lower(BTRIM(COALESCE(p_provider, '')));
  v_settings_id uuid;
  v_has_secret boolean;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Only admins can update AI agent settings.';
  END IF;

  IF v_provider = '' OR v_provider !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'A valid provider name is required (lowercase letters, numbers and hyphens).';
  END IF;

  INSERT INTO public.ai_agent_settings (tenant_key, provider, model, enabled, status)
  VALUES ('default', v_provider, NULLIF(BTRIM(p_model), ''), p_enabled, 'not_configured')
  ON CONFLICT (tenant_key, provider) DO UPDATE SET
    model = NULLIF(BTRIM(p_model), ''),
    enabled = p_enabled,
    updated_at = now()
  RETURNING id INTO v_settings_id;

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
        WHEN v_has_secret AND p_enabled AND v_provider = 'anthropic' THEN 'connected'
        WHEN v_has_secret THEN 'unverified'
        ELSE 'not_configured'
      END,
      updated_at = now()
  WHERE id = v_settings_id;

  RETURN v_settings_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_ai_agent_credentials(p_provider text)
RETURNS TABLE (model text, api_key text, enabled boolean)
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
  WHERE s.tenant_key = 'default' AND s.provider = lower(BTRIM(COALESCE(p_provider, '')))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.record_ai_agent_test(
  p_provider text,
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
  SET status = CASE WHEN p_success THEN 'connected' ELSE 'error' END,
      last_error = NULLIF(BTRIM(COALESCE(p_error_message, '')), ''),
      last_tested_at = now(),
      updated_at = now()
  WHERE tenant_key = 'default' AND provider = lower(BTRIM(COALESCE(p_provider, '')));
END; $$;

CREATE OR REPLACE FUNCTION public.delete_ai_agent_settings(
  p_provider text,
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
    RAISE EXCEPTION 'Only admins can remove AI agent settings.';
  END IF;

  DELETE FROM public.ai_agent_settings
  WHERE tenant_key = 'default' AND provider = lower(BTRIM(COALESCE(p_provider, '')));
END; $$;

GRANT EXECUTE ON FUNCTION public.upsert_ai_agent_settings(text, text, boolean, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_ai_agent_credentials(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_agent_credentials(text) TO service_role;
REVOKE ALL ON FUNCTION public.record_ai_agent_test(text, boolean, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ai_agent_test(text, boolean, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_ai_agent_settings(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_ai_agent_settings(text, uuid) TO authenticated;