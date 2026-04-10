-- Security hardening for RLS, anonymous analytics writes, storage buckets, and lead provider credentials.

-- integration_health_metrics_dashboard is a view, so access is controlled by
-- grants plus the security_invoker base-table RLS policies rather than view RLS policies.
CREATE OR REPLACE VIEW public.integration_health_metrics_dashboard
  WITH (security_invoker = true)
  AS
  SELECT c.id AS integration_connection_id,
     c.tenant_key,
     c.provider,
     max(
         CASE
             WHEN m.success THEN m.run_completed_at
             ELSE NULL::timestamp with time zone
         END) AS last_successful_run_at,
     COALESCE(max(m.source_lag_seconds), 0) AS lag_behind_source_seconds,
     COALESCE(round(avg(m.error_rate), 4), (0)::numeric) AS error_rate,
     COALESCE(round(avg(m.records_processed), 2), (0)::numeric) AS records_processed_per_run
    FROM (public.integration_connections c
      LEFT JOIN public.integration_sync_run_metrics m ON ((m.integration_connection_id = c.id)))
   GROUP BY c.id, c.tenant_key, c.provider;

REVOKE ALL ON public.integration_health_metrics_dashboard FROM anon;
REVOKE ALL ON public.integration_health_metrics_dashboard FROM PUBLIC;
GRANT SELECT ON public.integration_health_metrics_dashboard TO authenticated;

-- Match ticket event reads to helpdesk_tickets visibility instead of granting all role users every event.
DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket events" ON public.helpdesk_ticket_events;
DROP POLICY IF EXISTS "Users can read authorized helpdesk ticket events" ON public.helpdesk_ticket_events;
CREATE POLICY "Users can read authorized helpdesk ticket events"
  ON public.helpdesk_ticket_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_edit_role(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.helpdesk_tickets t
      WHERE t.id = helpdesk_ticket_events.ticket_id
        AND (
          t.owner_user_id = auth.uid()
          OR t.partner_contact_id IN (
            SELECT p.crm_contact_id
            FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.crm_contact_id IS NOT NULL
          )
        )
    )
  );

-- can_access_customer_portal_feature is used inside RLS policies; it must not mutate identity rows.
CREATE OR REPLACE FUNCTION public.can_access_customer_portal_feature(
  p_user_id uuid DEFAULT auth.uid(),
  p_feature_key text DEFAULT 'quotes'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  v_status text := 'pending_profile';
  v_override boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_feature_key NOT IN ('quotes', 'helpdesk', 'pricelists', 'private-orders') THEN
    RETURN false;
  END IF;

  IF public.has_edit_role(p_user_id) THEN
    RETURN true;
  END IF;

  SELECT portal_access_status INTO v_status
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  SELECT enabled INTO v_override
  FROM public.customer_portal_feature_overrides
  WHERE user_id = p_user_id
    AND feature_key = p_feature_key
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  RETURN v_status = 'approved_customer';
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_customer_portal_feature(uuid, text) TO authenticated;

-- Public analytics clients update sessions through a token-checked RPC, not a broad table UPDATE policy.
ALTER TABLE public.website_analytics_sessions
  ADD COLUMN IF NOT EXISTS write_token text;

DROP POLICY IF EXISTS website_analytics_sessions_insert_public ON public.website_analytics_sessions;
CREATE POLICY website_analytics_sessions_insert_public
  ON public.website_analytics_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    write_token IS NOT NULL
    AND length(write_token) >= 32
    AND btrim(visitor_id) <> ''
  );

DROP POLICY IF EXISTS website_analytics_sessions_update_public ON public.website_analytics_sessions;
REVOKE UPDATE ON public.website_analytics_sessions FROM anon, authenticated;

DROP POLICY IF EXISTS website_analytics_pageviews_insert_public ON public.website_analytics_pageviews;
CREATE POLICY website_analytics_pageviews_insert_public
  ON public.website_analytics_pageviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    btrim(visitor_id) <> ''
    AND btrim(pathname) <> ''
    AND pathname LIKE '/%'
  );

DROP POLICY IF EXISTS website_analytics_web_vitals_insert_public ON public.website_analytics_web_vitals;
CREATE POLICY website_analytics_web_vitals_insert_public
  ON public.website_analytics_web_vitals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    btrim(visitor_id) <> ''
    AND btrim(pathname) <> ''
    AND pathname LIKE '/%'
    AND btrim(metric_id) <> ''
    AND btrim(metric_name) <> ''
  );

CREATE OR REPLACE FUNCTION public.upsert_website_analytics_session(p_session jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := (p_session->>'id')::uuid;
  v_write_token text := p_session->>'write_token';
BEGIN
  IF v_id IS NULL OR v_write_token IS NULL OR length(v_write_token) < 32 THEN
    RAISE EXCEPTION 'Invalid analytics session token.';
  END IF;

  UPDATE public.website_analytics_sessions
  SET
    visitor_id = p_session->>'visitor_id',
    started_at = COALESCE((p_session->>'started_at')::timestamptz, started_at),
    last_seen_at = COALESCE((p_session->>'last_seen_at')::timestamptz, last_seen_at),
    landing_path = COALESCE(NULLIF(p_session->>'landing_path', ''), landing_path),
    pageview_count = GREATEST(COALESCE((p_session->>'pageview_count')::integer, pageview_count), 0),
    duration_seconds = GREATEST(COALESCE((p_session->>'duration_seconds')::integer, duration_seconds), 0),
    engaged = COALESCE((p_session->>'engaged')::boolean, engaged),
    is_returning_visitor = COALESCE((p_session->>'is_returning_visitor')::boolean, is_returning_visitor),
    device_type = COALESCE(NULLIF(p_session->>'device_type', ''), device_type),
    referrer_host = COALESCE(NULLIF(p_session->>'referrer_host', ''), referrer_host),
    user_agent = p_session->>'user_agent',
    updated_at = now()
  WHERE id = v_id
    AND write_token = v_write_token;

  IF FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.website_analytics_sessions WHERE id = v_id) THEN
    RAISE EXCEPTION 'Invalid analytics session token.';
  END IF;

  INSERT INTO public.website_analytics_sessions (
    id,
    write_token,
    visitor_id,
    started_at,
    last_seen_at,
    landing_path,
    pageview_count,
    duration_seconds,
    engaged,
    is_returning_visitor,
    device_type,
    referrer_host,
    user_agent,
    updated_at
  )
  VALUES (
    v_id,
    v_write_token,
    p_session->>'visitor_id',
    COALESCE((p_session->>'started_at')::timestamptz, now()),
    COALESCE((p_session->>'last_seen_at')::timestamptz, now()),
    COALESCE(NULLIF(p_session->>'landing_path', ''), '/'),
    GREATEST(COALESCE((p_session->>'pageview_count')::integer, 1), 0),
    GREATEST(COALESCE((p_session->>'duration_seconds')::integer, 0), 0),
    COALESCE((p_session->>'engaged')::boolean, false),
    COALESCE((p_session->>'is_returning_visitor')::boolean, false),
    COALESCE(NULLIF(p_session->>'device_type', ''), 'desktop'),
    COALESCE(NULLIF(p_session->>'referrer_host', ''), 'Direct'),
    p_session->>'user_agent',
    now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_website_analytics_session(jsonb) TO anon, authenticated;

-- Encrypt lead provider API credentials at rest and remove the plaintext credential column.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.lead_provider_credentials
  ADD COLUMN IF NOT EXISTS encrypted_credential bytea;

DELETE FROM public.lead_provider_credentials
WHERE credential IS NULL OR btrim(credential) = '';

UPDATE public.lead_provider_credentials
SET encrypted_credential = pgp_sym_encrypt(credential, public.integration_secret_encryption_key())
WHERE encrypted_credential IS NULL;

ALTER TABLE public.lead_provider_credentials
  ALTER COLUMN encrypted_credential SET NOT NULL;

DROP FUNCTION IF EXISTS public.upsert_lead_provider_credential(text, text, text);
DROP FUNCTION IF EXISTS public.list_lead_provider_credentials_status(text);
DROP FUNCTION IF EXISTS public.get_lead_provider_credentials(text);

ALTER TABLE public.lead_provider_credentials
  DROP COLUMN IF EXISTS credential;

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
    encrypted_credential,
    updated_by
  )
  VALUES (
    v_tenant_key,
    p_provider,
    pgp_sym_encrypt(btrim(p_credential), public.integration_secret_encryption_key()),
    auth.uid()
  )
  ON CONFLICT (tenant_key, provider)
  DO UPDATE SET
    encrypted_credential = EXCLUDED.encrypted_credential,
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
    c.encrypted_credential IS NOT NULL AS configured,
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
    jsonb_object_agg(c.provider, pgp_sym_decrypt(c.encrypted_credential, public.integration_secret_encryption_key())::text),
    '{}'::jsonb
  )
  FROM public.lead_provider_credentials c
  WHERE c.tenant_key = COALESCE(NULLIF(p_tenant_key, ''), 'default')
    AND has_role(auth.uid(), 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.upsert_lead_provider_credential(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_lead_provider_credentials_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_provider_credentials(text) TO authenticated;

-- Make public-bucket object policies explicit: public reads, editor-only writes.
DROP POLICY IF EXISTS "Public can read zenvue-branding" ON storage.objects;
CREATE POLICY "Public can read zenvue-branding"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'zenvue-branding');

DROP POLICY IF EXISTS "Editors can upload to zenvue-branding" ON storage.objects;
CREATE POLICY "Editors can upload to zenvue-branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'zenvue-branding' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can update zenvue-branding" ON storage.objects;
CREATE POLICY "Editors can update zenvue-branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'zenvue-branding' AND public.has_edit_role(auth.uid()))
  WITH CHECK (bucket_id = 'zenvue-branding' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can delete from zenvue-branding" ON storage.objects;
CREATE POLICY "Editors can delete from zenvue-branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'zenvue-branding' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Public can read catalog-assets" ON storage.objects;
CREATE POLICY "Public can read catalog-assets"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'catalog-assets');

DROP POLICY IF EXISTS "Editors can upload to catalog-assets" ON storage.objects;
CREATE POLICY "Editors can upload to catalog-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalog-assets' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can update catalog-assets" ON storage.objects;
CREATE POLICY "Editors can update catalog-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'catalog-assets' AND public.has_edit_role(auth.uid()))
  WITH CHECK (bucket_id = 'catalog-assets' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can delete from catalog-assets" ON storage.objects;
CREATE POLICY "Editors can delete from catalog-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'catalog-assets' AND public.has_edit_role(auth.uid()));

NOTIFY pgrst, 'reload schema';
