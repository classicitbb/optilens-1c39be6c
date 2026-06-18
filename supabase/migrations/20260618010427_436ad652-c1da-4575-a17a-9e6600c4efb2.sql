
-- API keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage api keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER api_keys_set_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- API audit log
CREATE TABLE public.api_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  method text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  status integer NOT NULL,
  request_summary jsonb DEFAULT '{}'::jsonb,
  response_summary jsonb DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_audit_log TO authenticated;
GRANT ALL ON public.api_audit_log TO service_role;

ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read api audit log"
  ON public.api_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX api_audit_log_key_created_idx
  ON public.api_audit_log (api_key_id, created_at DESC);

-- Create API key RPC; returns the plaintext token ONCE
CREATE OR REPLACE FUNCTION public.create_api_key(
  p_name text,
  p_scopes text[],
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_secret text;
  v_prefix text;
  v_token text;
  v_hash text;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create API keys.';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'API key name is required.';
  END IF;

  v_prefix := encode(extensions.gen_random_bytes(4), 'hex');
  v_secret := encode(extensions.gen_random_bytes(24), 'hex');
  v_token := 'clv_live_' || v_prefix || '_' || v_secret;
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.api_keys (name, key_prefix, key_hash, scopes, created_by, expires_at)
  VALUES (btrim(p_name), v_prefix, v_hash, COALESCE(p_scopes, '{}'), auth.uid(), p_expires_at)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'name', btrim(p_name),
    'key_prefix', v_prefix,
    'token', v_token,
    'scopes', COALESCE(p_scopes, '{}'),
    'expires_at', p_expires_at
  );
END;
$$;

-- Revoke API key RPC
CREATE OR REPLACE FUNCTION public.revoke_api_key(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke API keys.';
  END IF;
  UPDATE public.api_keys SET revoked_at = COALESCE(revoked_at, now()) WHERE id = p_id;
END;
$$;

-- Verify API key (called by edge function with service role)
CREATE OR REPLACE FUNCTION public.verify_api_key(p_token text)
RETURNS TABLE(id uuid, scopes text[], name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_hash text;
  v_row public.api_keys%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN RETURN; END IF;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_row FROM public.api_keys WHERE key_hash = v_hash;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_row.revoked_at IS NOT NULL THEN RETURN; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RETURN; END IF;

  UPDATE public.api_keys SET last_used_at = now() WHERE id = v_row.id;

  RETURN QUERY SELECT v_row.id, v_row.scopes, v_row.name;
END;
$$;
