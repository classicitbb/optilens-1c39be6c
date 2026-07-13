
-- 1) Restrict direct SELECT on addons/lenses/supplies to staff (admin/operator).
--    Viewer/customer roles continue to access via get_*_safe RPCs and *_public views.
DROP POLICY IF EXISTS "Role users can select addons" ON public.addons;
CREATE POLICY "Staff can select addons" ON public.addons FOR SELECT TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select lenses" ON public.lenses;
CREATE POLICY "Staff can select lenses" ON public.lenses FOR SELECT TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select supplies" ON public.supplies;
CREATE POLICY "Staff can select supplies" ON public.supplies FOR SELECT TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- 2) Strip sell_price too for restricted roles in get_supplies_safe.
CREATE OR REPLACE FUNCTION public.get_supplies_safe()
 RETURNS TABLE(id uuid, supplier_id uuid, brand_id uuid, base_price numeric, sell_price numeric, quantity_per_unit integer, is_active boolean, show_on_website boolean, show_in_pricelist boolean, bb_item boolean, duty_added boolean, vat_paid boolean, labour_added boolean, preferred boolean, stocked boolean, stk_wspl boolean, image_url text, notes text, bin text, detail text, currency text, name text, category text, description text, sku text, unit text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.supplier_id, s.brand_id,
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE s.base_price END AS base_price,
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE s.sell_price END AS sell_price,
    s.quantity_per_unit, s.is_active, s.show_on_website, s.show_in_pricelist,
    s.bb_item, s.duty_added, s.vat_paid, s.labour_added, s.preferred, s.stocked, s.stk_wspl,
    s.image_url, s.notes, s.bin, s.detail, s.currency, s.name, s.category, s.description,
    s.sku, s.unit, s.created_at, s.updated_at
  FROM public.supplies s
  WHERE has_any_role(auth.uid())
$function$;

-- 3) Bound public analytics inserts to prevent unrestricted text injection.
DROP POLICY IF EXISTS website_analytics_sessions_insert_public ON public.website_analytics_sessions;
CREATE POLICY website_analytics_sessions_insert_public
  ON public.website_analytics_sessions FOR INSERT TO anon, authenticated
  WITH CHECK (
    visitor_id IS NOT NULL AND char_length(visitor_id) BETWEEN 1 AND 128
    AND (landing_path IS NULL OR char_length(landing_path) <= 512)
    AND (referrer_host IS NULL OR char_length(referrer_host) <= 256)
    AND (device_type IS NULL OR char_length(device_type) <= 32)
    AND (user_agent IS NULL OR char_length(user_agent) <= 512)
    AND COALESCE(pageview_count, 0) BETWEEN 0 AND 10000
    AND COALESCE(duration_seconds, 0) BETWEEN 0 AND 86400
  );

DROP POLICY IF EXISTS website_analytics_pageviews_insert_public ON public.website_analytics_pageviews;
CREATE POLICY website_analytics_pageviews_insert_public
  ON public.website_analytics_pageviews FOR INSERT TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL
    AND visitor_id IS NOT NULL AND char_length(visitor_id) BETWEEN 1 AND 128
    AND pathname IS NOT NULL AND char_length(pathname) BETWEEN 1 AND 512
    AND (referrer_host IS NULL OR char_length(referrer_host) <= 256)
    AND (device_type IS NULL OR char_length(device_type) <= 32)
  );

DROP POLICY IF EXISTS website_analytics_web_vitals_insert_public ON public.website_analytics_web_vitals;
CREATE POLICY website_analytics_web_vitals_insert_public
  ON public.website_analytics_web_vitals FOR INSERT TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL
    AND visitor_id IS NOT NULL AND char_length(visitor_id) BETWEEN 1 AND 128
    AND pathname IS NOT NULL AND char_length(pathname) BETWEEN 1 AND 512
    AND metric_name IS NOT NULL AND char_length(metric_name) BETWEEN 1 AND 64
    AND (metric_id IS NULL OR char_length(metric_id) <= 128)
    AND (metric_rating IS NULL OR char_length(metric_rating) <= 32)
    AND (device_type IS NULL OR char_length(device_type) <= 32)
    AND metric_value IS NOT NULL AND metric_value >= 0 AND metric_value < 1e9
  );
