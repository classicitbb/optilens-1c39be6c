-- catalog builder
DROP POLICY IF EXISTS "Authenticated users can read catalog page objects" ON public.catalog_page_objects;
CREATE POLICY "Staff can read catalog page objects" ON public.catalog_page_objects FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can read catalog pages" ON public.catalog_pages;
CREATE POLICY "Staff can read catalog pages" ON public.catalog_pages FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));

-- innovations lab sync tables
DROP POLICY IF EXISTS "Staff with edit role can read Innovations store lenses" ON public.innovations_store_lenses;
CREATE POLICY "Staff can read Innovations store lenses catalog" ON public.innovations_store_lenses FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));
DROP POLICY IF EXISTS "Staff with edit role can read Innovations store lens powers" ON public.innovations_store_lens_power_rows;
CREATE POLICY "Staff can read Innovations store lens power rows" ON public.innovations_store_lens_power_rows FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));

-- gateway/health telemetry
DROP POLICY IF EXISTS "Staff can read live data gateway agents" ON public.live_data_gateway_agents;
CREATE POLICY "Staff can read live data gateway agents" ON public.live_data_gateway_agents FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));
DROP POLICY IF EXISTS "Staff can read live data gateway request log" ON public.live_data_gateway_request_log;
CREATE POLICY "Staff can read live data gateway request log" ON public.live_data_gateway_request_log FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));
DROP POLICY IF EXISTS "Staff can read edge function health" ON public.edge_function_health;
CREATE POLICY "Staff can read edge function health" ON public.edge_function_health FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));

-- rx pricelist structuring
DROP POLICY IF EXISTS "Authenticated users can read rx_price_categories" ON public.rx_price_categories;
DROP POLICY IF EXISTS "Authenticated users can read rx_price_category_versions" ON public.rx_price_category_versions;
DROP POLICY IF EXISTS "Authenticated users can read rx_price_groupings" ON public.rx_price_groupings;
DROP POLICY IF EXISTS "Authenticated users can read rx_price_grouping_versions" ON public.rx_price_grouping_versions;

-- operational reference data
DROP POLICY IF EXISTS "Authenticated users can read charge_types" ON public.charge_types;
CREATE POLICY "Staff can read charge_types" ON public.charge_types FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can read shipment_types" ON public.shipment_types;
CREATE POLICY "Staff can read shipment_types" ON public.shipment_types FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view priorities" ON public.helpdesk_priorities;
CREATE POLICY "Staff can view helpdesk priorities" ON public.helpdesk_priorities FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view pricing items" ON public.pricing_items;
CREATE POLICY "Staff can view pricing items" ON public.pricing_items FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid()));