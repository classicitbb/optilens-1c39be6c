
-- 1. Fix Security Definer View: integration_health_metrics_dashboard
DROP VIEW IF EXISTS public.integration_health_metrics_dashboard;
CREATE VIEW public.integration_health_metrics_dashboard
WITH (security_invoker = true)
AS
SELECT
  c.id AS integration_connection_id,
  c.tenant_key,
  c.provider,
  max(CASE WHEN m.success THEN m.run_completed_at ELSE NULL END) AS last_successful_run_at,
  COALESCE(max(m.source_lag_seconds), 0) AS lag_behind_source_seconds,
  COALESCE(round(avg(m.error_rate), 4), 0::numeric) AS error_rate,
  COALESCE(round(avg(m.records_processed), 2), 0::numeric) AS records_processed_per_run
FROM integration_connections c
LEFT JOIN integration_sync_run_metrics m ON m.integration_connection_id = c.id
GROUP BY c.id, c.tenant_key, c.provider;

REVOKE ALL ON public.integration_health_metrics_dashboard FROM anon;
REVOKE ALL ON public.integration_health_metrics_dashboard FROM PUBLIC;
GRANT SELECT ON public.integration_health_metrics_dashboard TO authenticated;

-- 2. Fix profiles RLS: restrict policies from PUBLIC to authenticated
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Fix contacts RLS: restrict from PUBLIC to authenticated
DROP POLICY IF EXISTS "Role users can select contacts" ON public.contacts;
CREATE POLICY "Role users can select contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can insert contacts" ON public.contacts;
CREATE POLICY "Editors can insert contacts"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can update contacts" ON public.contacts;
CREATE POLICY "Editors can update contacts"
  ON public.contacts FOR UPDATE TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can delete contacts" ON public.contacts;
CREATE POLICY "Editors can delete contacts"
  ON public.contacts FOR DELETE TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- 4. Fix wholesale_inquiries: restrict INSERT to anon+authenticated, keep SELECT/UPDATE admin-only
DROP POLICY IF EXISTS "Anyone can submit wholesale inquiry" ON public.wholesale_inquiries;
CREATE POLICY "Anyone can submit wholesale inquiry"
  ON public.wholesale_inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view wholesale inquiries" ON public.wholesale_inquiries;
CREATE POLICY "Admins can view wholesale inquiries"
  ON public.wholesale_inquiries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update wholesale inquiries" ON public.wholesale_inquiries;
CREATE POLICY "Admins can update wholesale inquiries"
  ON public.wholesale_inquiries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Fix function search_path: redact_pii_jsonb
CREATE OR REPLACE FUNCTION public.redact_pii_jsonb(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb := '{}'::jsonb; v_key text; v_val jsonb;
BEGIN
  IF p_payload IS NULL THEN RETURN '{}'::jsonb; END IF;
  IF jsonb_typeof(p_payload) = 'array' THEN
    RETURN (SELECT jsonb_agg(public.redact_pii_jsonb(elem)) FROM jsonb_array_elements(p_payload) elem);
  END IF;
  IF jsonb_typeof(p_payload) <> 'object' THEN RETURN p_payload; END IF;
  FOR v_key, v_val IN SELECT key, value FROM jsonb_each(p_payload) LOOP
    IF v_key ~* '(password|secret|token|credential|authorization|api[_-]?key|ssn|tax_id|vat|email|phone)' THEN
      v_result := v_result || jsonb_build_object(v_key, '[REDACTED]');
    ELSE
      v_result := v_result || jsonb_build_object(v_key, public.redact_pii_jsonb(v_val));
    END IF;
  END LOOP;
  RETURN v_result;
END; $function$;

-- 6. Revoke encryption key function from PUBLIC/authenticated
REVOKE ALL ON FUNCTION public.integration_secret_encryption_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.integration_secret_encryption_key() FROM authenticated;
REVOKE ALL ON FUNCTION public.integration_secret_encryption_key() FROM anon;

-- 7. Restrict storage bucket write access to admin/operator
DROP POLICY IF EXISTS "Authenticated users can upload to data-files" ON storage.objects;
CREATE POLICY "Editors can upload to data-files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'data-files' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update data-files" ON storage.objects;
CREATE POLICY "Editors can update data-files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'data-files' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete from data-files" ON storage.objects;
CREATE POLICY "Editors can delete from data-files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'data-files' AND public.has_edit_role(auth.uid()));

-- 8. Restrict public read to authenticated only
DROP POLICY IF EXISTS "Public read access for data-files" ON storage.objects;
CREATE POLICY "Authenticated read access for data-files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'data-files');
