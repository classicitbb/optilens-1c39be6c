
-- Drop overly permissive INSERT/UPDATE/DELETE policies on rx_price_categories
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.rx_price_categories;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.rx_price_categories;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.rx_price_categories;

-- Drop overly permissive INSERT/UPDATE/DELETE policies on rx_price_groupings
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.rx_price_groupings;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.rx_price_groupings;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.rx_price_groupings;

-- Drop overly permissive INSERT/UPDATE/DELETE policies on rx_price_category_versions
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.rx_price_category_versions;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.rx_price_category_versions;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.rx_price_category_versions;

-- Drop overly permissive INSERT/UPDATE/DELETE policies on rx_price_grouping_versions
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.rx_price_grouping_versions;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.rx_price_grouping_versions;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.rx_price_grouping_versions;

-- Restricted policies for rx_price_categories
CREATE POLICY "Editors can insert rx_price_categories" ON public.rx_price_categories FOR INSERT TO authenticated WITH CHECK (public.has_edit_role(auth.uid()));
CREATE POLICY "Editors can update rx_price_categories" ON public.rx_price_categories FOR UPDATE TO authenticated USING (public.has_edit_role(auth.uid())) WITH CHECK (public.has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete rx_price_categories" ON public.rx_price_categories FOR DELETE TO authenticated USING (public.has_edit_role(auth.uid()));

-- Restricted policies for rx_price_groupings
CREATE POLICY "Editors can insert rx_price_groupings" ON public.rx_price_groupings FOR INSERT TO authenticated WITH CHECK (public.has_edit_role(auth.uid()));
CREATE POLICY "Editors can update rx_price_groupings" ON public.rx_price_groupings FOR UPDATE TO authenticated USING (public.has_edit_role(auth.uid())) WITH CHECK (public.has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete rx_price_groupings" ON public.rx_price_groupings FOR DELETE TO authenticated USING (public.has_edit_role(auth.uid()));

-- Restricted policies for rx_price_category_versions
CREATE POLICY "Editors can insert rx_price_category_versions" ON public.rx_price_category_versions FOR INSERT TO authenticated WITH CHECK (public.has_edit_role(auth.uid()));
CREATE POLICY "Editors can update rx_price_category_versions" ON public.rx_price_category_versions FOR UPDATE TO authenticated USING (public.has_edit_role(auth.uid())) WITH CHECK (public.has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete rx_price_category_versions" ON public.rx_price_category_versions FOR DELETE TO authenticated USING (public.has_edit_role(auth.uid()));

-- Restricted policies for rx_price_grouping_versions
CREATE POLICY "Editors can insert rx_price_grouping_versions" ON public.rx_price_grouping_versions FOR INSERT TO authenticated WITH CHECK (public.has_edit_role(auth.uid()));
CREATE POLICY "Editors can update rx_price_grouping_versions" ON public.rx_price_grouping_versions FOR UPDATE TO authenticated USING (public.has_edit_role(auth.uid())) WITH CHECK (public.has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete rx_price_grouping_versions" ON public.rx_price_grouping_versions FOR DELETE TO authenticated USING (public.has_edit_role(auth.uid()));
