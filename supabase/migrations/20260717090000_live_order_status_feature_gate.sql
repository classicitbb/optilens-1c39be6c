-- Keep unfinished live lab/delivery status hidden from public portal users
-- unless staff explicitly enables that customer feature. Also expose the
-- customer's assigned pricelist name through a scoped RPC; pricelist_versions
-- remains staff-only under RLS.

ALTER TABLE public.customer_portal_feature_overrides
  DROP CONSTRAINT IF EXISTS customer_portal_feature_overrides_feature_key_check;

ALTER TABLE public.customer_portal_feature_overrides
  ADD CONSTRAINT customer_portal_feature_overrides_feature_key_check
  CHECK (feature_key IN ('quotes', 'helpdesk', 'pricelists', 'private-orders', 'live-order-status', 'statements'));

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
    RETURN v_status = 'approved_customer'
      AND public.can_access_customer_statement(p_user_id);
  END IF;

  IF p_feature_key = 'live-order-status' THEN
    RETURN v_override = true;
  END IF;

  IF v_override = true THEN
    RETURN true;
  END IF;

  RETURN v_status = 'approved_customer';
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_customer_portal_feature(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_customer_portal_feature(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_customer_portal_feature(uuid, text) TO service_role;

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
