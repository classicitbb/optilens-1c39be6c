-- Rx order form: off for customers unless staff explicitly enable it.
--
-- The form is being rebuilt and is used by staff in admin meanwhile. Until now
-- every approved customer had 'rx-order' by default; it now behaves like
-- 'order-prices' on the client (usePortalIdentity.canAccessPortalFeature): an
-- explicit enabled override is required. Staff are unaffected because
-- has_edit_role() returns true before any override is read. The Rx write
-- policies (20260904103733) call this function, so customer writes are
-- blocked here as well as hidden in the UI.
--
-- Body copied from 20260902130130; only the 'rx-order' branch is new.
CREATE OR REPLACE FUNCTION public.can_access_customer_portal_feature(p_user_id uuid DEFAULT auth.uid(), p_feature_key text DEFAULT 'quotes'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text := 'pending_profile';
  v_override boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_feature_key NOT IN ('quotes', 'helpdesk', 'pricelists', 'private-orders', 'live-order-status', 'statements', 'order-prices', 'auto-notifications', 'rx-order') THEN
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

  IF p_feature_key = 'rx-order' THEN
    RETURN v_override IS TRUE;
  END IF;

  IF v_override = true THEN
    RETURN true;
  END IF;

  RETURN v_status = 'approved_customer';
END;
$function$;

-- Switch off the explicit customer grants too, so no customer keeps the form.
-- Most were carried over when the Lens Assistant key was renamed to 'rx-order'
-- (20260902130130). Staff overrides are left alone; staff have access anyway.
-- Re-enable a pilot customer from the admin Portals page.
UPDATE public.customer_portal_feature_overrides
SET enabled = false,
    updated_at = now()
WHERE feature_key = 'rx-order'
  AND enabled = true
  AND NOT public.has_edit_role(user_id);

NOTIFY pgrst, 'reload schema';
