-- Portal company access is granted to the person login, not to every contact
-- under the linked company. Pricing requires the "Approved Access to Pricing"
-- tag on that person contact. Statements require "Approved Access to Statement"
-- on that person contact. CEO is the person-level override tag for both.

INSERT INTO public.contact_tags (name, color, category)
SELECT 'Approved Access to Pricing', '#C89130', 'Portal Access'
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_tags WHERE lower(btrim(name)) = 'approved access to pricing'
);

INSERT INTO public.contact_tags (name, color, category)
SELECT 'Approved Access to Statement', '#C89130', 'Portal Access'
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_tags WHERE lower(btrim(name)) = 'approved access to statement'
);

CREATE OR REPLACE FUNCTION public.can_access_customer_pricing(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RETURN false;
  END IF;

  IF public.has_edit_role(p_user_id) THEN
    RETURN true;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND
     OR v_profile.portal_access_status <> 'approved_customer'
     OR v_profile.crm_contact_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.contact_tag_links link
    JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE link.contact_id = v_profile.crm_contact_id
      AND lower(btrim(tag.name)) IN ('approved access to pricing', 'ceo')
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_customer_pricing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_customer_pricing(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_customer_statement(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RETURN false;
  END IF;

  IF public.has_edit_role(p_user_id) THEN
    RETURN true;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND
     OR v_profile.portal_access_status <> 'approved_customer'
     OR v_profile.crm_contact_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.contact_tag_links link
    JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE link.contact_id = v_profile.crm_contact_id
      AND lower(btrim(tag.name)) IN ('approved access to statement', 'approved access to statements', 'ceo')
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_customer_statement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_customer_statement(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_customer_portal_feature(
  p_user_id uuid DEFAULT auth.uid(),
  p_feature_key text DEFAULT 'quotes'::text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text := 'pending_profile';
  v_override boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_feature_key NOT IN ('quotes', 'helpdesk', 'pricelists', 'private-orders', 'live-order-status', 'statements') THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
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

  IF v_override = false THEN
    RETURN false;
  END IF;

  IF p_feature_key = 'statements' THEN
    RETURN public.can_access_customer_statement(p_user_id);
  END IF;

  IF p_feature_key = 'pricelists' THEN
    RETURN public.can_access_customer_pricing(p_user_id);
  END IF;

  IF p_feature_key = 'live-order-status' THEN
    RETURN v_status = 'approved_customer' AND v_override = true;
  END IF;

  IF v_override = true THEN
    RETURN true;
  END IF;

  RETURN v_status = 'approved_customer';
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_customer_portal_feature(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_customer_portal_feature(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_matrix()
RETURNS TABLE (
  category text,
  material_index text,
  treatment_type text,
  allocated_price_bbd numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_master_markup numeric;
  v_master_discount numeric;
  v_child_section_id integer;
  v_child_markup numeric;
  v_child_discount numeric;
BEGIN
  IF NOT public.can_access_customer_pricing(auth.uid()) THEN
    RETURN;
  END IF;

  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(pv.master_markup_percent, 0), COALESCE(pv.master_discount_percent, 0)
  INTO v_master_markup, v_master_discount
  FROM public.pricelist_versions pv
  WHERE pv.id = v_pricelist_version_id;

  SELECT pcs.id, COALESCE(pcs.child_markup_percent, 0), COALESCE(pcs.child_discount_percent, 0)
  INTO v_child_section_id, v_child_markup, v_child_discount
  FROM public.pricelist_child_sections pcs
  WHERE pcs.pricelist_version_id = v_pricelist_version_id AND pcs.section_type = 'RX Lens Prices'
  LIMIT 1;

  RETURN QUERY
  SELECT
    ma.category,
    ma.material_index,
    ma.treatment_type,
    ROUND(
      COALESCE(
        plo.overridden_price_bbd,
        ma.allocated_price_bbd
          * (1 + COALESCE(v_master_markup, 0) / 100) * (1 - COALESCE(v_master_discount, 0) / 100)
          * (1 + COALESCE(v_child_markup, 0) / 100) * (1 - COALESCE(v_child_discount, 0) / 100)
      ),
      2
    ) AS allocated_price_bbd
  FROM public.matrix_allocations ma
  LEFT JOIN public.pricelist_line_overrides plo
    ON plo.reference_type = 'matrix_allocation'
   AND plo.reference_id = ma.id::text
   AND plo.child_section_id = v_child_section_id
  WHERE ma.pricelist_version_id = v_pricelist_version_id
    AND ma.is_active IS NOT FALSE
    AND ma.allocated_price_bbd IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_matrix() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_matrix() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_addons()
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_master_markup numeric;
  v_master_discount numeric;
  v_child_section_id integer;
  v_child_markup numeric;
  v_child_discount numeric;
BEGIN
  IF NOT public.can_access_customer_pricing(auth.uid()) THEN
    RETURN;
  END IF;

  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(pv.master_markup_percent, 0), COALESCE(pv.master_discount_percent, 0)
  INTO v_master_markup, v_master_discount
  FROM public.pricelist_versions pv
  WHERE pv.id = v_pricelist_version_id;

  SELECT pcs.id, COALESCE(pcs.child_markup_percent, 0), COALESCE(pcs.child_discount_percent, 0)
  INTO v_child_section_id, v_child_markup, v_child_discount
  FROM public.pricelist_child_sections pcs
  WHERE pcs.pricelist_version_id = v_pricelist_version_id AND pcs.section_type = 'RX Lens Prices'
  LIMIT 1;

  RETURN QUERY
  SELECT
    r.section,
    r.display_description,
    r.row_type,
    ROUND(
      COALESCE(
        plo.overridden_price_bbd,
        r.bbd_price
          * (1 + COALESCE(v_master_markup, 0) / 100) * (1 - COALESCE(v_master_discount, 0) / 100)
          * (1 + COALESCE(v_child_markup, 0) / 100) * (1 - COALESCE(v_child_discount, 0) / 100)
      ),
      2
    ) AS bbd_price,
    r.sort_order
  FROM public.pricelist_catalog_rows r
  LEFT JOIN public.pricelist_line_overrides plo
    ON plo.reference_type = r.row_type
   AND plo.reference_id = r.item_id::text
   AND plo.child_section_id = v_child_section_id
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = 'rx'
    AND r.row_type IN ('addon', 'treatment', 'supply')
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_addons() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_addons() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_catalog(p_catalog_type text)
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_master_markup numeric;
  v_master_discount numeric;
  v_section_type text;
  v_child_section_id integer;
  v_child_markup numeric;
  v_child_discount numeric;
BEGIN
  IF p_catalog_type NOT IN ('rx', 'stock', 'buysell') THEN
    RETURN;
  END IF;

  IF NOT public.can_access_customer_pricing(auth.uid()) THEN
    RETURN;
  END IF;

  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(pv.master_markup_percent, 0), COALESCE(pv.master_discount_percent, 0)
  INTO v_master_markup, v_master_discount
  FROM public.pricelist_versions pv
  WHERE pv.id = v_pricelist_version_id;

  v_section_type := CASE p_catalog_type
    WHEN 'rx' THEN 'RX Lens Prices'
    WHEN 'stock' THEN 'Stock Lens Prices'
    WHEN 'buysell' THEN 'Supplies Prices'
  END;

  SELECT pcs.id, COALESCE(pcs.child_markup_percent, 0), COALESCE(pcs.child_discount_percent, 0)
  INTO v_child_section_id, v_child_markup, v_child_discount
  FROM public.pricelist_child_sections pcs
  WHERE pcs.pricelist_version_id = v_pricelist_version_id AND pcs.section_type = v_section_type
  LIMIT 1;

  RETURN QUERY
  SELECT
    r.section,
    r.display_description,
    r.row_type,
    ROUND(
      COALESCE(
        plo.overridden_price_bbd,
        r.bbd_price
          * (1 + COALESCE(v_master_markup, 0) / 100) * (1 - COALESCE(v_master_discount, 0) / 100)
          * (1 + COALESCE(v_child_markup, 0) / 100) * (1 - COALESCE(v_child_discount, 0) / 100)
      ),
      2
    ) AS bbd_price,
    r.sort_order
  FROM public.pricelist_catalog_rows r
  LEFT JOIN public.pricelist_line_overrides plo
    ON plo.reference_type = r.row_type
   AND plo.reference_id = r.item_id::text
   AND plo.child_section_id = v_child_section_id
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = p_catalog_type
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_catalog(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_catalog(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_details(
  p_customer_id integer DEFAULT NULL
)
RETURNS TABLE (
  name text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_customer_id integer;
BEGIN
  IF p_customer_id IS NOT NULL AND public.has_edit_role(auth.uid()) THEN
    v_customer_id := p_customer_id;
  ELSE
    IF NOT public.can_access_customer_pricing(auth.uid()) THEN
      RETURN;
    END IF;

    SELECT p.crm_customer_id INTO v_customer_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pv.name, pv.updated_at
  FROM public.customers c
  INNER JOIN public.pricelist_versions pv ON pv.id = c.assigned_pricelist_id
  WHERE c.id = v_customer_id
  LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_details(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_details(integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
