CREATE OR REPLACE FUNCTION public.queue_account_payment_receipt(p_payment_id uuid, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Intentionally a no-op. Account payment receipts are now sent by the
  -- edge functions through the managed email transport (see
  -- supabase/functions/_shared/email/statement-payment-receipt.ts).
  -- The previous body called public.enqueue_email(), which was removed in the
  -- email rebuild; the resulting error rolled back settlement of payments the
  -- gateway had already approved.
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_statement_payment(p_payment_id uuid, p_gateway jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_approved boolean := COALESCE((p_gateway ->> 'approved')::boolean, false);
  v_updated_id uuid;
BEGIN
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'settle_statement_payment requires a payment id';
  END IF;

  UPDATE public.account_payments
  SET
    status = CASE WHEN v_approved THEN 'settled' ELSE 'failed' END,
    gateway_oid = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'oid', '')), ''), gateway_oid),
    gateway_response_code = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'association_response_code', '')), ''), gateway_response_code),
    gateway_fail_rc = NULLIF(BTRIM(COALESCE(p_gateway ->> 'fail_rc', '')), ''),
    currency = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'currency', '')), ''), currency)
  WHERE id = p_payment_id AND status = 'pending'
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    SELECT id INTO v_updated_id FROM public.account_payments WHERE id = p_payment_id;
    IF v_updated_id IS NULL THEN
      RAISE EXCEPTION 'No statement payment found for id %', p_payment_id;
    END IF;
    RETURN v_updated_id;
  END IF;

  IF v_approved THEN
    BEGIN
      PERFORM public.queue_account_payment_receipt(v_updated_id, 'submitted');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'settle_statement_payment: receipt step failed for % (%).', v_updated_id, SQLERRM;
    END;
  END IF;

  RETURN v_updated_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_account_payment(p_payment_id uuid, p_bank_reference text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and operators can confirm payments.';
  END IF;

  UPDATE public.account_payments
  SET status = 'confirmed',
      confirmed_at = now(),
      bank_reference = COALESCE(NULLIF(BTRIM(COALESCE(p_bank_reference, '')), ''), bank_reference)
  WHERE id = p_payment_id AND status IN ('settled', 'pending')
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    PERFORM public.queue_account_payment_receipt(v_id, 'confirmed');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'confirm_account_payment: receipt step failed for % (%).', v_id, SQLERRM;
  END;

  RETURN v_id;
END;
$function$;