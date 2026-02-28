CREATE TABLE IF NOT EXISTS public.lead_provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  provider text NOT NULL,
  credential text NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_key, provider)
);

ALTER TABLE public.lead_provider_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage lead_provider_credentials" ON public.lead_provider_credentials;
CREATE POLICY "Admins can manage lead_provider_credentials"
  ON public.lead_provider_credentials FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.upsert_lead_provider_credential(
  p_provider text,
  p_credential text,
  p_tenant_key text DEFAULT 'default'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_key text := COALESCE(NULLIF(p_tenant_key, ''), 'default');
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage lead provider credentials.';
  END IF;

  IF p_credential IS NULL OR btrim(p_credential) = '' THEN
    DELETE FROM public.lead_provider_credentials
    WHERE tenant_key = v_tenant_key
      AND provider = p_provider;
    RETURN;
  END IF;

  INSERT INTO public.lead_provider_credentials (
    tenant_key,
    provider,
    credential,
    updated_by
  )
  VALUES (
    v_tenant_key,
    p_provider,
    btrim(p_credential),
    auth.uid()
  )
  ON CONFLICT (tenant_key, provider)
  DO UPDATE SET
    credential = EXCLUDED.credential,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.list_lead_provider_credentials_status(
  p_tenant_key text DEFAULT 'default'
)
RETURNS TABLE(provider text, configured boolean, updated_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.provider,
    true AS configured,
    c.updated_at
  FROM public.lead_provider_credentials c
  WHERE c.tenant_key = COALESCE(NULLIF(p_tenant_key, ''), 'default')
    AND has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_lead_provider_credentials(
  p_tenant_key text DEFAULT 'default'
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(c.provider, c.credential),
    '{}'::jsonb
  )
  FROM public.lead_provider_credentials c
  WHERE c.tenant_key = COALESCE(NULLIF(p_tenant_key, ''), 'default')
    AND has_role(auth.uid(), 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.upsert_lead_provider_credential(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_lead_provider_credentials_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_provider_credentials(text) TO authenticated;
