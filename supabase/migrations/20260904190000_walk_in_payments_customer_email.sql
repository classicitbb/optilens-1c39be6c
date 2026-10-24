-- Add customer_email to walk_in_payments table and update create_walk_in_payment

ALTER TABLE public.walk_in_payments
  ADD COLUMN IF NOT EXISTS customer_email text;

ALTER TABLE public.walk_in_payments
  DROP CONSTRAINT IF EXISTS walk_in_payments_customer_email_check;

ALTER TABLE public.walk_in_payments
  ADD CONSTRAINT walk_in_payments_customer_email_check
  CHECK (customer_email IS NULL OR customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

DROP FUNCTION IF EXISTS public.create_walk_in_payment(numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.create_walk_in_payment(
  p_amount numeric,
  p_customer_name text,
  p_order_reference text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_customer_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
  v_email text := NULLIF(BTRIM(COALESCE(p_customer_email, '')), '');
BEGIN
  IF v_actor IS NULL OR NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'A staff edit role is required to take a walk-in payment.';
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

  v_id := gen_random_uuid();
  INSERT INTO public.walk_in_payments (
    id, created_by, customer_name, customer_email, order_reference, reason, amount, payment_reference
  ) VALUES (
    v_id,
    v_actor,
    BTRIM(p_customer_name),
    v_email,
    NULLIF(BTRIM(COALESCE(p_order_reference, '')), ''),
    NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    ROUND(p_amount, 2),
    'WALKIN-' || v_id::text
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_walk_in_payment(numeric, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_walk_in_payment(numeric, text, text, text, text) TO authenticated;
