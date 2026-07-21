-- Graduate live-order-status out of "opt-in only, unfinished" mode.
-- It now follows the same default as private-orders/quotes/helpdesk:
-- any approved_customer gets access without a per-user override row,
-- while an explicit override can still force it on/off. This matches
-- what pricelists/statements already do via their own tag-backed RPCs,
-- and unblocks "My Orders" for every approved customer on deploy
-- instead of requiring staff to flip a per-customer switch.

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

  IF v_override = true THEN
    RETURN true;
  END IF;

  RETURN v_status = 'approved_customer';
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_customer_portal_feature(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_customer_portal_feature(uuid, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
