-- The customer portal's "Assigned Pricelist" page needs the actual matrix
-- prices, not just pricelist_versions metadata. matrix_allocations and
-- pricelist_versions are staff-only under RLS (has_any_role), so this
-- bridges a customer to their own assigned version's rows only — no
-- parameter to tamper with, the version is resolved server-side from the
-- caller's own profile, same pattern as get_portal_erp_account_number().

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
BEGIN
  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ma.category, ma.material_index, ma.treatment_type, ma.allocated_price_bbd
  FROM public.matrix_allocations ma
  WHERE ma.pricelist_version_id = v_pricelist_version_id
    AND ma.is_active IS NOT FALSE
    AND ma.allocated_price_bbd IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_matrix() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_matrix() TO authenticated;

-- pricelist_versions itself is also staff-only under RLS — the portal page
-- only needs to know when its assigned version last changed, not the
-- internal version name/id.
CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_updated_at()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT pv.updated_at
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  INNER JOIN public.pricelist_versions pv ON pv.id = c.assigned_pricelist_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_updated_at() TO authenticated;

NOTIFY pgrst, 'reload schema';
