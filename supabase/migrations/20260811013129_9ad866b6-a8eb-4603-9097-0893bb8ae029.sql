ALTER TABLE public.account_payments DROP CONSTRAINT IF EXISTS account_payments_status_check;
ALTER TABLE public.account_payments ADD CONSTRAINT account_payments_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'settled'::text, 'confirmed'::text, 'failed'::text]));
ALTER TABLE public.account_payments ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.account_payments ADD COLUMN IF NOT EXISTS bank_reference text;

CREATE OR REPLACE FUNCTION public.queue_account_payment_receipt(p_payment_id uuid, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment public.account_payments%ROWTYPE;
  v_email text;
  v_name text;
  v_message_id text;
  v_subject text;
  v_html text;
  v_text text;
  v_amount text;
BEGIN
  SELECT * INTO v_payment FROM public.account_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(p.email, u.email), COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Customer')
    INTO v_email, v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = v_payment.user_id;

  IF v_email IS NULL OR BTRIM(v_email) = '' THEN RETURN; END IF;

  v_message_id := 'account-payment-' || p_kind || '-' || p_payment_id::text;
  IF EXISTS (SELECT 1 FROM public.email_send_log WHERE message_id = v_message_id) THEN RETURN; END IF;

  v_amount := to_char(v_payment.amount, 'FM999999990.00');

  IF p_kind = 'confirmed' THEN
    v_subject := 'Payment confirmed — $' || v_amount || ' received on your account';
    v_html := '<h1>Payment confirmed</h1>'
      || '<p>Hello ' || v_name || ',</p>'
      || '<p>We have verified your payment of <strong>$' || v_amount || '</strong> and it has now been applied to your account'
      || COALESCE(' (' || v_payment.account_number || ')', '') || '.</p>'
      || COALESCE('<p>Bank reference: ' || v_payment.bank_reference || '</p>', '')
      || '<p>Payment reference: ' || p_payment_id::text || '</p>'
      || '<p>Thank you for your business.<br/>Classic Visions</p>';
    v_text := 'Payment confirmed' || E'\n'
      || 'Amount: $' || v_amount || E'\n'
      || 'Account: ' || COALESCE(v_payment.account_number, '-') || E'\n'
      || 'Reference: ' || p_payment_id::text;
  ELSE
    v_subject := 'Payment receipt — $' || v_amount || ' submitted';
    v_html := '<h1>Thank you for your payment</h1>'
      || '<p>Hello ' || v_name || ',</p>'
      || '<p>We received your card payment of <strong>$' || v_amount || '</strong>'
      || COALESCE(' for account ' || v_payment.account_number, '') || '.</p>'
      || '<p>This payment will appear on your account once it has been verified with the bank. '
      || 'You will receive a confirmation receipt as soon as that happens.</p>'
      || '<p>Payment reference: ' || p_payment_id::text || '</p>'
      || '<p>Classic Visions</p>';
    v_text := 'Thank you for your payment' || E'\n'
      || 'Amount: $' || v_amount || E'\n'
      || 'Account: ' || COALESCE(v_payment.account_number, '-') || E'\n'
      || 'This payment will appear on your account after bank verification. A confirmation receipt follows.' || E'\n'
      || 'Reference: ' || p_payment_id::text;
  END IF;

  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status)
  VALUES (v_message_id, 'account-payment-' || p_kind, v_email, 'pending');

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', v_message_id,
    'to', v_email,
    'from', 'Classic Visions Accounts <orders@classicvisions.net>',
    'sender_domain', 'support.classicvisions.net',
    'subject', v_subject,
    'html', v_html,
    'text', v_text,
    'purpose', 'transactional',
    'label', 'account-payment-' || p_kind,
    'idempotency_key', v_message_id,
    'queued_at', now()
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.queue_account_payment_receipt(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_account_payment_receipt(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.settle_statement_payment(p_payment_id uuid, p_gateway jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    PERFORM public.queue_account_payment_receipt(v_updated_id, 'submitted');
  END IF;

  RETURN v_updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_account_payment(p_payment_id uuid, p_bank_reference text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  PERFORM public.queue_account_payment_receipt(v_id, 'confirmed');
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_account_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_account_payment(uuid, text) TO authenticated, service_role;