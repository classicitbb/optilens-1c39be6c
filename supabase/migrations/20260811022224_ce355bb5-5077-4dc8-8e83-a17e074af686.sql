CREATE OR REPLACE FUNCTION public.get_customer_payment_profile(p_customer_id integer DEFAULT NULL)
RETURNS TABLE (
  customer_id integer,
  account_number text,
  name text,
  pay_by_card boolean,
  pay_by_eft boolean,
  eft_institution_name text,
  default_payment_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer_id integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.can_access_customer_portal_feature(v_uid, 'statements') THEN
    RETURN;
  END IF;

  SELECT p.crm_customer_id INTO v_customer_id
  FROM public.profiles p
  WHERE p.user_id = v_uid
  LIMIT 1;

  IF p_customer_id IS NOT NULL THEN
    IF p_customer_id IS DISTINCT FROM v_customer_id
       AND NOT EXISTS (
         SELECT 1 FROM public.portal_account_memberships m
         WHERE m.user_id = v_uid
           AND m.customer_id = p_customer_id
           AND m.status = 'active'
           AND m.revoked_at IS NULL
       ) THEN
      RETURN;
    END IF;
    v_customer_id := p_customer_id;
  END IF;

  IF v_customer_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id,
         c.account_number,
         c.name,
         c.pay_by_card,
         c.pay_by_eft,
         c.eft_institution_name,
         c.default_payment_type
  FROM public.customers c
  WHERE c.id = v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_payment_profile(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_payment_profile(integer) TO authenticated;