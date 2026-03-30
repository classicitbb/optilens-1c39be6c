
-- Drop overly permissive "true" INSERT/UPDATE/DELETE policies on all 4 rx pricing tables
-- Keep the SELECT "true" policies (read access for authenticated users is intended)
-- Keep the editor-role-gated policies for write operations

DROP POLICY "Authenticated users can delete rx_price_categories" ON public.rx_price_categories;
DROP POLICY "Authenticated users can insert rx_price_categories" ON public.rx_price_categories;
DROP POLICY "Authenticated users can update rx_price_categories" ON public.rx_price_categories;

DROP POLICY "Authenticated users can delete rx_price_category_versions" ON public.rx_price_category_versions;
DROP POLICY "Authenticated users can insert rx_price_category_versions" ON public.rx_price_category_versions;
DROP POLICY "Authenticated users can update rx_price_category_versions" ON public.rx_price_category_versions;

DROP POLICY "Authenticated users can delete rx_price_grouping_versions" ON public.rx_price_grouping_versions;
DROP POLICY "Authenticated users can insert rx_price_grouping_versions" ON public.rx_price_grouping_versions;
DROP POLICY "Authenticated users can update rx_price_grouping_versions" ON public.rx_price_grouping_versions;

DROP POLICY "Authenticated users can delete rx_price_groupings" ON public.rx_price_groupings;
DROP POLICY "Authenticated users can insert rx_price_groupings" ON public.rx_price_groupings;
DROP POLICY "Authenticated users can update rx_price_groupings" ON public.rx_price_groupings;
