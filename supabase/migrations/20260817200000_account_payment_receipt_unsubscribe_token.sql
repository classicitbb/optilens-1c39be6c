-- queue_account_payment_receipt enqueues purpose:"transactional" mail without
-- an unsubscribe_token, which the email API hard-rejects
-- ("missing_unsubscribe" -> dead-lettered). Every other enqueue path
-- (send-transactional-email, contact-inquiry, order-confirmation, etc.) already
-- attaches one via a get-or-create lookup against email_unsubscribe_tokens;
-- this migration brings the payment-receipt path in line.
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
  v_normalized_email text;
  v_unsubscribe_token text;
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

  -- Get-or-create the recipient's unsubscribe token (one per email, reused
  -- across sends until used) — same lookup the edge-function enqueue paths do.
  v_normalized_email := lower(v_email);
  SELECT token INTO v_unsubscribe_token
  FROM public.email_unsubscribe_tokens
  WHERE email = v_normalized_email AND used_at IS NULL;

  IF v_unsubscribe_token IS NULL THEN
    INSERT INTO public.email_unsubscribe_tokens (token, email)
    VALUES (encode(gen_random_bytes(32), 'hex'), v_normalized_email)
    ON CONFLICT (email) DO NOTHING;

    SELECT token INTO v_unsubscribe_token
    FROM public.email_unsubscribe_tokens
    WHERE email = v_normalized_email;
  END IF;

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
    'unsubscribe_token', v_unsubscribe_token,
    'queued_at', now()
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.queue_account_payment_receipt(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_account_payment_receipt(uuid, text) TO service_role;
