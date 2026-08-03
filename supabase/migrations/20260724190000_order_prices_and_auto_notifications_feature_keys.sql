-- Add order-prices feature key so admins can enable per-customer visibility
-- of pricing on the customer's Order status / lab shipment views (default
-- off; requires an explicit true override). Also backfills auto-notifications
-- into the allowlist -- it was already used by the admin Operations panel to
-- gate the auto-notifications override upsert, but was never added to this
-- constraint (see src/lib/portalFeatureOverrideErrors.ts FEATURE_MIGRATION_HINTS).
--
-- can_access_customer_portal_feature is recreated verbatim from its current
-- production definition (which had already drifted from earlier migration
-- files in this repo -- see the caller-identity guard and the statements/
-- pricelists branches below) with only the feature_key allowlist widened.

ALTER TABLE public.customer_portal_feature_overrides
  DROP CONSTRAINT IF EXISTS customer_portal_feature_overrides_feature_key_check;

ALTER TABLE public.customer_portal_feature_overrides
  ADD CONSTRAINT customer_portal_feature_overrides_feature_key_check
  CHECK (feature_key = ANY (ARRAY['quotes'::text, 'helpdesk'::text, 'pricelists'::text, 'private-orders'::text, 'live-order-status'::text, 'statements'::text, 'order-prices'::text, 'auto-notifications'::text]));

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

  IF p_feature_key NOT IN ('quotes', 'helpdesk', 'pricelists', 'private-orders', 'live-order-status', 'statements', 'order-prices', 'auto-notifications') THEN
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
$function$;

NOTIFY pgrst, 'reload schema';
