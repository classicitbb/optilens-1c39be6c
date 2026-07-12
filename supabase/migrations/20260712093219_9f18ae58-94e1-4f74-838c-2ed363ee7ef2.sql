
-- Grant read access to base tables and public views for storefront
GRANT SELECT ON public.lenses TO anon, authenticated;
GRANT SELECT ON public.supplies TO anon, authenticated;
GRANT SELECT ON public.addons TO anon, authenticated;
GRANT SELECT ON public.lenses_public TO anon, authenticated;
GRANT SELECT ON public.supplies_public TO anon, authenticated;
GRANT SELECT ON public.addons_public TO anon, authenticated;

-- Public read policies limited to items published to the website
DROP POLICY IF EXISTS "Public can view website lenses" ON public.lenses;
CREATE POLICY "Public can view website lenses"
  ON public.lenses FOR SELECT
  TO anon, authenticated
  USING (show_on_website = true AND is_active = true);

DROP POLICY IF EXISTS "Public can view website supplies" ON public.supplies;
CREATE POLICY "Public can view website supplies"
  ON public.supplies FOR SELECT
  TO anon, authenticated
  USING (show_on_website = true AND is_active = true);

DROP POLICY IF EXISTS "Public can view website addons" ON public.addons;
CREATE POLICY "Public can view website addons"
  ON public.addons FOR SELECT
  TO anon, authenticated
  USING (show_on_website = true AND is_active = true);
