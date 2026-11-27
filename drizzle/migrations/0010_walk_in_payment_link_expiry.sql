-- Publish a counter payment with a staff-selected expiry in the same transaction.
CREATE OR REPLACE FUNCTION public.publish_walk_in_payment_with_expiry(
  p_amount numeric,
  p_customer_name text,
  p_expires_at timestamptz,
  p_customer_email text DEFAULT NULL,
  p_order_reference text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_published jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'A staff edit role is required to take a walk-in payment.';
  END IF;
  IF p_expires_at IS NULL OR NOT isfinite(p_expires_at) OR p_expires_at <= now() THEN
    RAISE EXCEPTION 'Choose an expiry date and time in the future.';
  END IF;

  v_published := public.publish_walk_in_payment(
    p_amount, p_customer_name, 'assisted_link', p_customer_email,
    p_order_reference, p_reason, p_contact_id
  );

  UPDATE public.walk_in_payments
  SET link_expires_at = p_expires_at
  WHERE id = (v_published->>'id')::uuid;

  RETURN v_published || jsonb_build_object('expires_at', p_expires_at);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_walk_in_payment_with_expiry(numeric, text, timestamptz, text, text, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_walk_in_payment_with_expiry(numeric, text, timestamptz, text, text, text, uuid)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
