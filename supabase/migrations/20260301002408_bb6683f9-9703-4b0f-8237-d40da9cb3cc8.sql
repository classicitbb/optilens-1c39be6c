
-- Table to store lead provider credentials
CREATE TABLE IF NOT EXISTS public.lead_provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  credential text NOT NULL DEFAULT '',
  tenant_key text NOT NULL DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, tenant_key)
);

ALTER TABLE public.lead_provider_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead_provider_credentials"
  ON public.lead_provider_credentials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Upsert credential
CREATE OR REPLACE FUNCTION public.upsert_lead_provider_credential(
  p_provider text,
  p_credential text,
  p_tenant_key text DEFAULT 'default'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.lead_provider_credentials (provider, credential, tenant_key, updated_at)
  VALUES (p_provider, p_credential, p_tenant_key, now())
  ON CONFLICT (provider, tenant_key)
  DO UPDATE SET credential = p_credential, updated_at = now();
END;
$$;

-- List credential statuses (never exposes actual credential)
CREATE OR REPLACE FUNCTION public.list_lead_provider_credentials_status(
  p_tenant_key text DEFAULT 'default'
)
RETURNS TABLE(provider text, configured boolean, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.provider,
    (c.credential IS NOT NULL AND c.credential <> '') AS configured,
    c.updated_at
  FROM public.lead_provider_credentials c
  WHERE c.tenant_key = p_tenant_key;
$$;

-- Get credentials (for edge functions only, requires auth)
CREATE OR REPLACE FUNCTION public.get_lead_provider_credentials(
  p_tenant_key text DEFAULT 'default'
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    jsonb_object_agg(c.provider, c.credential),
    '{}'::jsonb
  )
  FROM public.lead_provider_credentials c
  WHERE c.tenant_key = p_tenant_key
    AND c.credential IS NOT NULL
    AND c.credential <> '';
$$;

NOTIFY pgrst, 'reload schema';
