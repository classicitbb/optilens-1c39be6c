-- Callback parameter bags are neither needed for settlement nor permitted in
-- storage. Clear existing values and retain only scalar reconciliation fields.
ALTER TABLE public.scotia_gateway_events
  ADD COLUMN IF NOT EXISTS amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency text;

UPDATE public.scotia_gateway_events
SET request_params = NULL,
    response_params = NULL
WHERE request_params IS NOT NULL
   OR response_params IS NOT NULL;

-- Minimal staff-facing card-payment confirmation feed. The view deliberately
-- projects only display-safe fields. security_invoker preserves the source
-- table's staff-only RLS.
CREATE OR REPLACE VIEW public.scotia_payment_activity
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (event.oid)
  event.created_at AS occurred_at,
  event.oid AS payment_reference,
  CASE WHEN event.oid LIKE 'STMT-%' THEN 'statement' ELSE 'order' END AS transaction_type,
  CASE
    WHEN event.outcome = 'ok' AND event.approved IS TRUE THEN 'Successful'
    WHEN event.outcome = 'declined' THEN 'Declined'
    ELSE 'Error'
  END AS status,
  event.amount,
  event.currency
FROM public.scotia_gateway_events AS event
WHERE event.oid IS NOT NULL
  AND (
    event.kind IN ('return', 'notify')
    OR (event.kind = 'prepare' AND event.outcome = 'error')
  )
ORDER BY event.oid, event.created_at DESC;

REVOKE ALL ON TABLE public.scotia_payment_activity FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.scotia_payment_activity TO authenticated;

-- Statement payment settlement now mirrors the existing order-token path.
-- The account-payment row retains only a relationship to the saved method;
-- the provider token itself exists only in customer_payment_methods.
ALTER TABLE public.account_payments
  ADD COLUMN IF NOT EXISTS saved_payment_method_id uuid
    REFERENCES public.customer_payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_saved_at timestamptz;

CREATE OR REPLACE FUNCTION public.settle_statement_payment(
  p_payment_id uuid,
  p_gateway jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_approved boolean := COALESCE((p_gateway ->> 'approved')::boolean, false);
  v_owner uuid;
  v_status text;
  v_updated_id uuid;
  v_payment_method_id uuid;
  v_hosteddataid text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'hosteddataid', '')), '');
  v_brand text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'card_brand', '')), '');
  v_last4 text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'card_last4', '')), '');
  v_cardholder text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'cardholder_name', '')), '');
  v_expiry_month integer := NULLIF(p_gateway ->> 'expiry_month', '')::integer;
  v_expiry_year integer := NULLIF(p_gateway ->> 'expiry_year', '')::integer;
  v_save_token boolean := COALESCE((p_gateway ->> 'save_token')::boolean, false);
BEGIN
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'settle_statement_payment requires a payment id';
  END IF;

  SELECT user_id, status INTO v_owner, v_status
  FROM public.account_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'No statement payment found for id %', p_payment_id;
  END IF;

  -- Return and notification callbacks can race; only the first one settles
  -- and, when requested, stores the provider-issued reusable token.
  IF v_status = 'pending' THEN
    IF v_approved AND v_save_token AND v_hosteddataid IS NOT NULL THEN
      INSERT INTO public.customer_payment_methods (
        user_id, provider, payment_token, cardholder_name, brand, last4,
        expiry_month, expiry_year, is_default, is_demo, status
      ) VALUES (
        v_owner,
        'scotia',
        v_hosteddataid,
        COALESCE(v_cardholder, 'Cardholder'),
        COALESCE(v_brand, 'Card'),
        COALESCE(NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(v_last4, ''), '\\D', '', 'g'), 4), ''), '0000'),
        COALESCE(v_expiry_month, 1),
        COALESCE(v_expiry_year, EXTRACT(year FROM now())::integer),
        COALESCE((SELECT COUNT(*) = 0 FROM public.customer_payment_methods WHERE user_id = v_owner AND status = 'active'), true),
        false,
        'active'
      )
      ON CONFLICT (payment_token) DO UPDATE
        SET status = 'active', updated_at = now()
      RETURNING id INTO v_payment_method_id;
    END IF;

    UPDATE public.account_payments
    SET
      status = CASE WHEN v_approved THEN 'settled' ELSE 'failed' END,
      gateway_oid = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'oid', '')), ''), gateway_oid),
      gateway_response_code = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'association_response_code', '')), ''), gateway_response_code),
      gateway_fail_rc = NULLIF(BTRIM(COALESCE(p_gateway ->> 'fail_rc', '')), ''),
      currency = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'currency', '')), ''), currency),
      saved_payment_method_id = COALESCE(v_payment_method_id, saved_payment_method_id),
      card_saved_at = CASE WHEN v_payment_method_id IS NOT NULL THEN now() ELSE card_saved_at END
    WHERE id = p_payment_id
    RETURNING id INTO v_updated_id;
  ELSE
    v_updated_id := p_payment_id;
  END IF;

  RETURN v_updated_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.settle_statement_payment(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_statement_payment(uuid, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
