-- Staff walk-in card payments are distinct from customer statement payments:
-- they are a staff-entered, exact-amount intent that is settled only after a
-- signed Scotia/Fiserv callback. No cardholder PAN, CVV, expiry, or token is
-- accepted by this table or its browser-callable function.

CREATE TABLE public.walk_in_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) > 0),
  order_reference text,
  reason text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0 AND amount <= 999999.99),
  currency text NOT NULL DEFAULT '840' CHECK (currency = '840'),
  provider text NOT NULL DEFAULT 'scotia' CHECK (provider = 'scotia'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'failed')),
  payment_reference text NOT NULL UNIQUE,
  gateway_oid text,
  gateway_transaction_id text,
  gateway_response_code text,
  gateway_fail_rc text,
  card_brand text,
  card_last4 text CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX walk_in_payments_created_at_idx ON public.walk_in_payments (created_at DESC);
CREATE INDEX walk_in_payments_reference_idx ON public.walk_in_payments (payment_reference);

CREATE TRIGGER update_walk_in_payments_updated_at
  BEFORE UPDATE ON public.walk_in_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.walk_in_payments ENABLE ROW LEVEL SECURITY;

-- Only staff permitted to take payments can see these payment records. The
-- service role settles them after validating the gateway HMAC.
CREATE POLICY "Staff can read walk-in payments"
  ON public.walk_in_payments
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

REVOKE ALL ON TABLE public.walk_in_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.walk_in_payments TO authenticated;
GRANT ALL ON TABLE public.walk_in_payments TO service_role;

CREATE OR REPLACE FUNCTION public.create_walk_in_payment(
  p_amount numeric,
  p_customer_name text,
  p_order_reference text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_id uuid;
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

  v_id := gen_random_uuid();
  INSERT INTO public.walk_in_payments (
    id, created_by, customer_name, order_reference, reason, amount, payment_reference
  ) VALUES (
    v_id,
    v_actor,
    BTRIM(p_customer_name),
    NULLIF(BTRIM(COALESCE(p_order_reference, '')), ''),
    NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    ROUND(p_amount, 2),
    'WALKIN-' || v_id::text
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_walk_in_payment(numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_walk_in_payment(numeric, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.settle_walk_in_payment(
  p_payment_id uuid,
  p_gateway jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.walk_in_payments%ROWTYPE;
  v_approved boolean := COALESCE((p_gateway ->> 'approved')::boolean, false);
  v_oid text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'oid', '')), '');
  v_gateway_amount numeric := NULLIF(BTRIM(COALESCE(p_gateway ->> 'chargetotal', '')), '')::numeric;
  v_last4 text := NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(p_gateway ->> 'card_last4', ''), '\D', '', 'g'), 4), '');
BEGIN
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'settle_walk_in_payment requires a payment id.';
  END IF;

  SELECT * INTO v_payment
  FROM public.walk_in_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Walk-in payment not found.';
  END IF;
  IF v_oid IS NULL OR v_oid <> v_payment.payment_reference THEN
    RAISE EXCEPTION 'Gateway payment reference does not match this walk-in payment.';
  END IF;
  IF v_gateway_amount IS NULL OR ROUND(v_gateway_amount, 2) <> ROUND(v_payment.amount, 2) THEN
    RAISE EXCEPTION 'Gateway amount does not match the walk-in payment.';
  END IF;
  IF v_payment.status = 'settled' THEN
    IF v_approved THEN RETURN v_payment.id; END IF;
    RAISE EXCEPTION 'A settled walk-in payment cannot be changed by a later gateway result.';
  END IF;
  IF v_payment.status = 'failed' THEN RETURN v_payment.id; END IF;

  UPDATE public.walk_in_payments
  SET
    status = CASE WHEN v_approved THEN 'settled' ELSE 'failed' END,
    gateway_oid = v_oid,
    gateway_transaction_id = COALESCE(
      NULLIF(BTRIM(COALESCE(p_gateway ->> 'gateway_transaction_id', '')), ''),
      gateway_transaction_id
    ),
    gateway_response_code = COALESCE(
      NULLIF(BTRIM(COALESCE(p_gateway ->> 'association_response_code', '')), ''),
      gateway_response_code
    ),
    gateway_fail_rc = NULLIF(BTRIM(COALESCE(p_gateway ->> 'fail_rc', '')), ''),
    card_brand = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'card_brand', '')), ''), card_brand),
    card_last4 = COALESCE(v_last4, card_last4),
    paid_at = CASE WHEN v_approved THEN COALESCE(paid_at, now()) ELSE paid_at END
  WHERE id = v_payment.id;

  RETURN v_payment.id;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_walk_in_payment(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_walk_in_payment(uuid, jsonb) TO service_role;
