-- The portal admin UI and the live-data-gateway both use a 'statements'
-- feature key, but the overrides table and the RLS helper still only knew
-- the original four keys, so enabling statement viewing failed with a
-- check-constraint violation.

ALTER TABLE public.customer_portal_feature_overrides
  DROP CONSTRAINT IF EXISTS customer_portal_feature_overrides_feature_key_check;

ALTER TABLE public.customer_portal_feature_overrides
  ADD CONSTRAINT customer_portal_feature_overrides_feature_key_check
  CHECK (feature_key IN ('quotes', 'helpdesk', 'pricelists', 'private-orders', 'statements'));

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

  IF p_feature_key NOT IN ('quotes', 'helpdesk', 'pricelists', 'private-orders', 'statements') THEN
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

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  RETURN v_status = 'approved_customer';
END;
$$;
