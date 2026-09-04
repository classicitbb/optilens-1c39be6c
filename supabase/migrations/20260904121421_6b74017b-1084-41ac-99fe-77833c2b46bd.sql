CREATE OR REPLACE FUNCTION public.create_pending_statement_payment(p_amount numeric, p_statement_id text DEFAULT NULL::text, p_crm_customer_id integer DEFAULT NULL::integer, p_account_number text DEFAULT NULL::text, p_actor_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(payment_id uuid, amount_usd numeric, amount_bbd numeric, fx_rate_bbd_per_usd numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
  v_fx_rate numeric; -- BBD per 1 USD, informational only now
  v_amount_bbd numeric;
  v_amount_usd numeric;
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  IF v_actor <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to start this payment.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'create_pending_statement_payment requires a positive amount';
  END IF;

  v_amount_bbd := ROUND(p_amount, 2);

  -- The Scotia store is provisioned in Barbados dollars, so the gateway is
  -- charged the BBD figure directly. The USD equivalent is kept purely as
  -- reporting context and never blocks a payment when no rate is configured.
  SELECT (ps.fx_rates ->> 'USD')::numeric INTO v_fx_rate
  FROM public.pricing_settings ps
  WHERE ps.is_active = true
  ORDER BY ps.version DESC
  LIMIT 1;

  IF v_fx_rate IS NOT NULL AND v_fx_rate > 0 THEN
    v_amount_usd := ROUND(v_amount_bbd / v_fx_rate, 2);
  END IF;

  INSERT INTO public.account_payments (
    user_id, crm_customer_id, account_number, statement_id,
    amount, amount_bbd, fx_rate_bbd_per_usd, currency, status
  ) VALUES (
    v_actor,
    p_crm_customer_id,
    NULLIF(BTRIM(COALESCE(p_account_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_statement_id, '')), ''),
    v_amount_bbd,
    v_amount_bbd,
    v_fx_rate,
    '052',
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_amount_usd, v_amount_bbd, v_fx_rate;
END; $function$;