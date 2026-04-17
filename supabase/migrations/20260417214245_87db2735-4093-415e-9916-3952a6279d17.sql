-- Allow anonymous (public website) users to read website-visible products only.

-- Lenses: anon can read rows flagged for website
CREATE POLICY "Anon can view website lenses"
  ON public.lenses FOR SELECT
  TO anon
  USING (show_on_website = true AND is_active = true);

-- Addons: anon can read rows flagged for website
CREATE POLICY "Anon can view website addons"
  ON public.addons FOR SELECT
  TO anon
  USING (show_on_website = true AND is_active = true);

-- Supplies: anon can read rows flagged for website
CREATE POLICY "Anon can view website supplies"
  ON public.supplies FOR SELECT
  TO anon
  USING (show_on_website = true AND is_active = true);

-- Reference tables joined for display (names only)
CREATE POLICY "Anon can view lenstypes"   ON public.lenstypes   FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view materials"   ON public.materials   FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view mftypes"     ON public.mftypes     FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view brands"      ON public.brands      FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view suppliers"   ON public.suppliers   FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view finishtypes" ON public.finishtypes FOR SELECT TO anon USING (true);

-- Public view used by storefront for supplies
GRANT SELECT ON public.supplies_public TO anon, authenticated;