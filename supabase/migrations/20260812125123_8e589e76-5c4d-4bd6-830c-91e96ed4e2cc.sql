ALTER TABLE public.gatekeeper_settings
  ADD COLUMN IF NOT EXISTS status_pull_token text;

UPDATE public.gatekeeper_settings
   SET status_pull_token = encode(gen_random_bytes(24), 'hex')
 WHERE status_pull_token IS NULL;

CREATE OR REPLACE FUNCTION public.verify_gatekeeper_status_pull_token(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gatekeeper_settings
     WHERE tenant_key = 'default'
       AND status_pull_token IS NOT NULL
       AND status_pull_token = p_token
  );
$$;

REVOKE ALL ON FUNCTION public.verify_gatekeeper_status_pull_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_gatekeeper_status_pull_token(text) TO service_role;