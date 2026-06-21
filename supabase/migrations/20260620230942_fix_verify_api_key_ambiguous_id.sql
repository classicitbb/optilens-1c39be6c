-- Fix: verify_api_key raised "column reference \"id\" is ambiguous".
-- RETURNS TABLE(id uuid, ...) declares `id` as an OUT variable that is in
-- scope for the whole body, so the bare `id` in the UPDATE ... WHERE clause
-- was ambiguous against the api_keys.id column. Qualify the column reference.
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

  UPDATE public.api_keys SET last_used_at = now() WHERE api_keys.id = v_row.id;

  RETURN QUERY SELECT v_row.id, v_row.scopes, v_row.name;
END;
$$;
