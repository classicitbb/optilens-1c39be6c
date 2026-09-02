ALTER TABLE public.customer_portal_feature_overrides
  DROP CONSTRAINT IF EXISTS customer_portal_feature_overrides_feature_key_check;

UPDATE public.customer_portal_feature_overrides o
SET feature_key = 'rx-order'
WHERE o.feature_key = 'lens-assistant'
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_portal_feature_overrides e
    WHERE e.user_id = o.user_id AND e.feature_key = 'rx-order'
  );

DELETE FROM public.customer_portal_feature_overrides WHERE feature_key = 'lens-assistant';

ALTER TABLE public.customer_portal_feature_overrides
  ADD CONSTRAINT customer_portal_feature_overrides_feature_key_check
  CHECK (feature_key = ANY (ARRAY[
    'quotes'::text,
    'helpdesk'::text,
    'pricelists'::text,
    'private-orders'::text,
    'live-order-status'::text,
    'statements'::text,
    'order-prices'::text,
    'auto-notifications'::text,
    'rx-order'::text
  ]));

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

  IF v_override = true THEN
    RETURN true;
  END IF;

  RETURN v_status = 'approved_customer';
END;
$function$;

NOTIFY pgrst, 'reload schema';