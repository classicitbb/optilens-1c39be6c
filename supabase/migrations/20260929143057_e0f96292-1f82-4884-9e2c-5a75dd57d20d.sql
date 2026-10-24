ALTER TABLE public.walk_in_payments DROP CONSTRAINT IF EXISTS walk_in_payments_provider_check;
ALTER TABLE public.walk_in_payments ADD CONSTRAINT walk_in_payments_provider_check CHECK (provider IN ('scotia', 'cash'));

-- Records cash taken at the counter. Cash is already in hand, so the row is
-- stored as settled immediately; only staff with an edit role may call it.
CREATE OR REPLACE FUNCTION public.record_walk_in_cash_payment(
  p_amount numeric,
  p_customer_name text,
  p_customer_email text DEFAULT NULL,
  p_order_reference text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_email text := NULLIF(BTRIM(COALESCE(p_customer_email, '')), '');
BEGIN
  IF v_actor IS NULL OR NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'A staff edit role is required to record a cash receipt.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 999999.99 THEN
    RAISE EXCEPTION 'Enter a payment amount greater than zero.';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_customer_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name is required.';
  END IF;
  IF v_email IS NOT NULL AND v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Please provide a valid email address.';
  END IF;

  INSERT INTO public.walk_in_payments (
    id, created_by, customer_name, customer_email, order_reference, reason,
    amount, payment_reference, provider, origin, status, paid_at, contact_id
  ) VALUES (
    v_id, v_actor, BTRIM(p_customer_name), v_email,
    NULLIF(BTRIM(COALESCE(p_order_reference, '')), ''),
    NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    ROUND(p_amount, 2), 'CASH-' || v_id::text, 'cash', 'staff_terminal', 'settled', now(), p_contact_id
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_walk_in_cash_payment(numeric, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_walk_in_cash_payment(numeric, text, text, text, text, uuid) TO authenticated;