-- The portal pricing RPCs resolved "which customer" purely from
-- profiles.crm_customer_id (the single default-account pointer), predating
-- portal_account_memberships (see 20260804194006_portal_multi_account_memberships.sql).
-- A login with more than one active membership could switch the active
-- account in the browser (AccountSwitcher) and see the label update, but
-- these RPCs kept returning the DEFAULT account's pricing/lab-access
-- decision regardless of which account was actually selected.
--
-- Add an optional p_customer_id, authorized against the caller's own active
-- membership via can_access_portal_account(). When omitted, fall back to the
-- previous profile-based resolution so any not-yet-updated caller keeps
-- working exactly as before.

DROP FUNCTION IF EXISTS public.can_access_customer_lab_pricing(uuid);
CREATE OR REPLACE FUNCTION public.can_access_customer_lab_pricing(
  p_user_id uuid DEFAULT auth.uid(),
  p_customer_id integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_contact_id uuid;
  v_customer_id integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RETURN false;
  END IF;

  IF p_customer_id IS NOT NULL THEN
    IF NOT public.can_access_portal_account(p_customer_id, p_user_id) THEN
      RETURN false;
    END IF;
    v_customer_id := p_customer_id;
    SELECT membership.contact_id INTO v_contact_id
    FROM public.portal_account_memberships membership
    WHERE membership.user_id = p_user_id
      AND membership.customer_id = p_customer_id
      AND membership.status = 'active'
    LIMIT 1;
  ELSE
    SELECT profile.crm_contact_id, profile.crm_customer_id INTO v_contact_id, v_customer_id
    FROM public.profiles profile
    WHERE profile.user_id = p_user_id
    LIMIT 1;
  END IF;

  IF v_contact_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.contact_tag_links link
    INNER JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE lower(btrim(tag.name)) = 'is lab'
      AND link.contact_id IN (
        SELECT contact_id
        FROM (
          SELECT v_contact_id AS contact_id
          UNION
          SELECT parent_id FROM public.contacts WHERE id = v_contact_id
          UNION
          SELECT contact_id FROM public.customers WHERE id = v_customer_id
          UNION
          SELECT id FROM public.contacts WHERE linked_customer_id = v_customer_id
        ) candidate_contacts
        WHERE contact_id IS NOT NULL
      )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_access_customer_lab_pricing(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_customer_lab_pricing(uuid, integer) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.portal_assigned_pricelist_matrix();
CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_matrix(p_customer_id integer DEFAULT NULL)
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
  IF p_customer_id IS NOT NULL THEN
    IF NOT public.can_access_portal_account(p_customer_id) THEN
      RETURN;
    END IF;
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.customers c
    WHERE c.id = p_customer_id;
  ELSE
    IF NOT public.can_access_customer_pricing(auth.uid()) THEN
      RETURN;
    END IF;
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.profiles p
    INNER JOIN public.customers c ON c.id = p.crm_customer_id
    WHERE p.user_id = auth.uid();
  END IF;

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

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_matrix(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_matrix(integer) TO authenticated;

DROP FUNCTION IF EXISTS public.portal_assigned_pricelist_updated_at();
CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_updated_at(p_customer_id integer DEFAULT NULL)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_updated_at timestamptz;
BEGIN
  IF p_customer_id IS NOT NULL THEN
    IF NOT public.can_access_portal_account(p_customer_id) THEN
      RETURN NULL;
    END IF;
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.customers c
    WHERE c.id = p_customer_id;
  ELSE
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.profiles p
    INNER JOIN public.customers c ON c.id = p.crm_customer_id
    WHERE p.user_id = auth.uid();
  END IF;

  IF v_pricelist_version_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT pv.updated_at INTO v_updated_at
  FROM public.pricelist_versions pv
  WHERE pv.id = v_pricelist_version_id;

  RETURN v_updated_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_updated_at(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_updated_at(integer) TO authenticated;

DROP FUNCTION IF EXISTS public.portal_assigned_pricelist_addons();
CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_addons(p_customer_id integer DEFAULT NULL)
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
  IF p_customer_id IS NOT NULL THEN
    IF NOT public.can_access_portal_account(p_customer_id) THEN
      RETURN;
    END IF;
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.customers c
    WHERE c.id = p_customer_id;
  ELSE
    IF NOT public.can_access_customer_pricing(auth.uid()) THEN
      RETURN;
    END IF;
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.profiles p
    INNER JOIN public.customers c ON c.id = p.crm_customer_id
    WHERE p.user_id = auth.uid();
  END IF;

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

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_addons(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_addons(integer) TO authenticated;

DROP FUNCTION IF EXISTS public.portal_assigned_pricelist_catalog(text);
CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_catalog(p_catalog_type text, p_customer_id integer DEFAULT NULL)
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

  IF p_customer_id IS NOT NULL THEN
    IF NOT public.can_access_portal_account(p_customer_id) THEN
      RETURN;
    END IF;
    v_can_access_lab_pricing := public.can_access_customer_lab_pricing(auth.uid(), p_customer_id);
    IF p_catalog_type = 'stock' AND NOT v_can_access_lab_pricing THEN
      RETURN;
    END IF;
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.customers c
    WHERE c.id = p_customer_id;
  ELSE
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
  END IF;

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

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_catalog(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_catalog(text, integer) TO authenticated;

-- This one already took p_customer_id, but only honored it when the CALLER
-- was staff (has_edit_role) — a customer passing their own switched-to
-- account id fell through to the ELSE branch and got their default account's
-- pricelist details back regardless. Also accept it when the caller holds an
-- active membership on that customer.
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
  IF p_customer_id IS NOT NULL AND (public.has_edit_role(auth.uid()) OR public.can_access_portal_account(p_customer_id)) THEN
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
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_details(integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
