CREATE TABLE public.innovations_family_lens_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innovations_lens_id text NOT NULL UNIQUE,
  lens_id uuid NOT NULL REFERENCES public.lenses(id) ON DELETE CASCADE,
  match_source text NOT NULL DEFAULT 'manual' CHECK (match_source IN ('auto_opc','manual')),
  confidence numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.innovations_family_lens_map TO authenticated;
GRANT ALL ON public.innovations_family_lens_map TO service_role;

ALTER TABLE public.innovations_family_lens_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read family lens map"
  ON public.innovations_family_lens_map FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

CREATE POLICY "Editors can insert family lens map"
  ON public.innovations_family_lens_map FOR INSERT TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Editors can update family lens map"
  ON public.innovations_family_lens_map FOR UPDATE TO authenticated
  USING (public.has_edit_role(auth.uid())) WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete family lens map"
  ON public.innovations_family_lens_map FOR DELETE TO authenticated
  USING (public.has_edit_role(auth.uid()));

CREATE TRIGGER innovations_family_lens_map_updated_at
  BEFORE UPDATE ON public.innovations_family_lens_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from OPC code matches (best match per family)
INSERT INTO public.innovations_family_lens_map (innovations_lens_id, lens_id, match_source, confidence)
SELECT DISTINCT ON (m.innovations_lens_id) m.innovations_lens_id, m.product_id, 'auto_opc', 1
FROM (
  SELECT p.innovations_lens_id, v.product_id, count(*) AS hits
  FROM public.innovations_store_lens_power_rows p
  JOIN public.store_product_variants v
    ON v.opc_code = p.right_opc AND v.product_type = 'lens'
  GROUP BY 1, 2
) m
ORDER BY m.innovations_lens_id, m.hits DESC
ON CONFLICT (innovations_lens_id) DO NOTHING;

-- Shared price resolution for every ordering surface
CREATE OR REPLACE FUNCTION public.resolve_customer_price(
  p_customer_id integer,
  p_product_type text,
  p_product_id uuid
)
RETURNS TABLE(unit_price numeric, price_source text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assigned integer;
  v_retail_assigned integer;
  v_catalog_price numeric;
  v_price numeric;
  v_source text;
BEGIN
  IF NOT (
    public.has_edit_role(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.user_id = auth.uid() AND pr.crm_customer_id = p_customer_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to read prices for this customer.' USING ERRCODE = '42501';
  END IF;

  IF p_product_type NOT IN ('lens','supply','addon') OR p_product_id IS NULL THEN
    RAISE EXCEPTION 'A valid website product is required.';
  END IF;

  SELECT assigned_pricelist_id INTO v_assigned FROM public.customers WHERE id = p_customer_id;

  SELECT assigned_pricelist_id INTO v_retail_assigned
  FROM public.customers WHERE lower(btrim(name)) = 'retail' LIMIT 1;

  IF p_product_type = 'lens' THEN
    SELECT sell_price INTO v_catalog_price FROM public.lenses WHERE id = p_product_id AND is_active;
  ELSIF p_product_type = 'supply' THEN
    SELECT sell_price INTO v_catalog_price FROM public.supplies WHERE id = p_product_id AND is_active;
  ELSE
    SELECT sell_price INTO v_catalog_price FROM public.addons WHERE id = p_product_id AND is_active;
  END IF;

  IF v_assigned IS NOT NULL THEN
    SELECT max(r.bbd_price) INTO v_price
    FROM public.pricelist_catalog_rows r
    WHERE r.pricelist_version_id = v_assigned
      AND r.catalog_type = 'stock' AND r.row_type = p_product_type
      AND r.item_id = p_product_id AND r.bbd_price > 0;
    IF v_price > 0 THEN v_source := 'assigned_pricelist'; END IF;
  END IF;

  IF (v_price IS NULL OR v_price <= 0) AND v_retail_assigned IS NOT NULL THEN
    SELECT max(r.bbd_price) INTO v_price
    FROM public.pricelist_catalog_rows r
    WHERE r.pricelist_version_id = v_retail_assigned
      AND r.catalog_type = 'stock' AND r.row_type = p_product_type
      AND r.item_id = p_product_id AND r.bbd_price > 0;
    IF v_price > 0 THEN v_source := 'retail_pricelist'; END IF;
  END IF;

  IF v_price IS NULL OR v_price <= 0 THEN
    v_price := v_catalog_price;
    IF v_price > 0 THEN v_source := 'catalog'; END IF;
  END IF;

  IF v_price IS NULL OR v_price <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT v_price, v_source;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_customer_price(integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_customer_price(integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_customer_price(integer, text, uuid) TO service_role;