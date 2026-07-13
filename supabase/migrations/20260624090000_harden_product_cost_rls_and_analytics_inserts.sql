-- Restrict cost-bearing product tables to editor roles and validate public analytics writes.

-- Authenticated viewers/customers must use the safe public views for catalog/product
-- browsing. Direct table reads expose cost-bearing columns and are staff-edit only.
DROP POLICY IF EXISTS "Role users can select addons" ON public.addons;
DROP POLICY IF EXISTS "Editors can select addons" ON public.addons;
CREATE POLICY "Editors can select addons"
  ON public.addons
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select lenses" ON public.lenses;
DROP POLICY IF EXISTS "Editors can select lenses" ON public.lenses;
CREATE POLICY "Editors can select lenses"
  ON public.lenses
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select supplies" ON public.supplies;
DROP POLICY IF EXISTS "Editors can select supplies" ON public.supplies;
CREATE POLICY "Editors can select supplies"
  ON public.supplies
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

GRANT SELECT ON public.addons_public TO anon, authenticated;
GRANT SELECT ON public.lenses_public TO anon, authenticated;
GRANT SELECT ON public.supplies_public TO anon, authenticated;

-- Keep anonymous analytics ingestion available for the public website, but reject
-- malformed rows instead of accepting arbitrary table writes with WITH CHECK true.
DROP POLICY IF EXISTS website_analytics_sessions_insert_public ON public.website_analytics_sessions;
CREATE POLICY website_analytics_sessions_insert_public
  ON public.website_analytics_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    visitor_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND write_token IS NOT NULL
    AND length(write_token) BETWEEN 64 AND 128
    AND write_token ~* '^[0-9a-f-]+$'
    AND landing_path LIKE '/%'
    AND length(landing_path) <= 2048
    AND pageview_count BETWEEN 0 AND 1000
    AND duration_seconds BETWEEN 0 AND 86400
    AND device_type IN ('desktop', 'mobile', 'tablet')
    AND length(referrer_host) <= 255
  );

DROP POLICY IF EXISTS website_analytics_pageviews_insert_public ON public.website_analytics_pageviews;
CREATE POLICY website_analytics_pageviews_insert_public
  ON public.website_analytics_pageviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    visitor_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND pathname LIKE '/%'
    AND length(pathname) <= 2048
    AND device_type IN ('desktop', 'mobile', 'tablet')
    AND length(referrer_host) <= 255
  );

DROP POLICY IF EXISTS website_analytics_web_vitals_insert_public ON public.website_analytics_web_vitals;
CREATE POLICY website_analytics_web_vitals_insert_public
  ON public.website_analytics_web_vitals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    visitor_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND pathname LIKE '/%'
    AND length(pathname) <= 2048
    AND metric_id <> ''
    AND length(metric_id) <= 128
    AND metric_name IN ('CLS', 'FCP', 'INP', 'LCP', 'TTFB')
    AND metric_value >= 0
    AND metric_value <= 86400000
    AND metric_delta >= 0
    AND metric_delta <= 86400000
    AND metric_rating IN ('good', 'needs-improvement', 'poor', 'unknown')
    AND device_type IN ('desktop', 'mobile', 'tablet')
  );

NOTIFY pgrst, 'reload schema';
