-- Lab-only pricing is deliberately decided from the CRM contact graph, not
-- from a browser flag. A person can inherit the tag from either their parent
-- company or the contact linked to their customer account, matching the
-- existing company-aware portal pricing model.
INSERT INTO public.contact_tags (name, color, category)
SELECT 'Is Lab', '#C89130', 'Portal Access'
WHERE NOT EXISTS (
  SELECT 1 FROM public.contact_tags WHERE lower(btrim(name)) = 'is lab'
);

CREATE OR REPLACE FUNCTION public.can_access_customer_lab_pricing(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND OR v_profile.crm_contact_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.contact_tag_links link
    INNER JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE lower(btrim(tag.name)) = 'is lab'
      AND link.contact_id IN (
        SELECT contact_id FROM (
          SELECT v_profile.crm_contact_id AS contact_id
          UNION
          SELECT parent_id FROM public.contacts WHERE id = v_profile.crm_contact_id
          UNION
          SELECT contact_id FROM public.customers WHERE id = v_profile.crm_customer_id
        ) candidate_contacts
        WHERE contact_id IS NOT NULL
      )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_access_customer_lab_pricing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_customer_lab_pricing(uuid) TO authenticated, service_role;

-- The item-id export migration superseded the authorization and price
-- hierarchy in these two portal RPCs. Restore both while retaining its
-- item_id/row_key output needed by the portal cart.
CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_catalog(p_catalog_type text)
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer,
  row_key text,
  catalog_type text,
  item_id uuid
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
  v_can_access_lab_pricing boolean := false;
BEGIN
  IF p_catalog_type NOT IN ('rx', 'stock', 'buysell') THEN
    RETURN;
  END IF;

  IF NOT public.can_access_customer_pricing(auth.uid()) THEN
    RETURN;
  END IF;

  v_can_access_lab_pricing := public.can_access_customer_lab_pricing(auth.uid());
  IF p_catalog_type = 'stock' AND NOT v_can_access_lab_pricing THEN
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
  WHERE pcs.pricelist_version_id = v_pricelist_version_id
    AND pcs.section_type = v_section_type
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
    r.sort_order,
    r.row_key,
    r.catalog_type,
    r.item_id
  FROM public.pricelist_catalog_rows r
  LEFT JOIN public.pricelist_line_overrides plo
    ON plo.reference_type = r.row_type
   AND plo.reference_id = r.item_id::text
   AND plo.child_section_id = v_child_section_id
  LEFT JOIN public.supplies supply
    ON r.row_type = 'supply'
   AND supply.id = r.item_id
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = p_catalog_type
    AND r.bbd_price IS NOT NULL
    -- A non-lab customer may still see ordinary supplies. Hide a Lab section
    -- even if an old catalog row has no linked supply, and also hide rows
    -- whose authoritative supply category is lab/lab supplies.
    AND (
      p_catalog_type <> 'buysell'
      OR v_can_access_lab_pricing
      OR (
        lower(btrim(COALESCE(r.section, ''))) NOT IN ('lab', 'lab supplies')
        AND lower(btrim(COALESCE(supply.category, ''))) NOT IN ('lab', 'lab supplies')
      )
    )
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_catalog(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_catalog(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_addons()
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer,
  row_key text,
  catalog_type text,
  item_id uuid
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
  WHERE pcs.pricelist_version_id = v_pricelist_version_id
    AND pcs.section_type = 'RX Lens Prices'
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
    r.sort_order,
    r.row_key,
    r.catalog_type,
    r.item_id
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

NOTIFY pgrst, 'reload schema';
