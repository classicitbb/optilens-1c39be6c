-- Add lens_id to portal_assigned_pricelist_matrix's output so callers can key
-- a specific lens catalog row to its resolved trade price. The function
-- previously only returned category/material_index/treatment_type, which is
-- what the pricelist matrix editor groups by, but gives no way to look up
-- "what does this one lens cost this customer" — needed to apply trade
-- pricing to individual lens rows in the public store catalog
-- (useStoreProducts / Store.tsx). Additive: existing callers destructure by
-- field name (AssignedPricelistsSection.tsx) and are unaffected by the new
-- column. Logic is otherwise unchanged from the live 20260805120000 version.

DROP FUNCTION IF EXISTS public.portal_assigned_pricelist_matrix(integer);
CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_matrix(p_customer_id integer DEFAULT NULL)
RETURNS TABLE (
  category text,
  material_index text,
  treatment_type text,
  allocated_price_bbd numeric,
  lens_id uuid
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
    ) AS allocated_price_bbd,
    ma.lens_id
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
