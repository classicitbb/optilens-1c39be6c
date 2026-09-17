CREATE OR REPLACE FUNCTION public.record_public_payment_attempt(
  p_ip_hash text,
  p_kind text,
  p_max_attempts integer,
  p_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.public_payment_attempts
  WHERE attempted_at < now() - make_interval(mins => GREATEST(p_window_minutes, 1) * 4);

  INSERT INTO public.public_payment_attempts (ip_hash, kind)
  VALUES (COALESCE(NULLIF(BTRIM(p_ip_hash), ''), 'unknown'), p_kind);

  SELECT count(*) INTO v_count
  FROM public.public_payment_attempts
  WHERE ip_hash = COALESCE(NULLIF(BTRIM(p_ip_hash), ''), 'unknown')
    AND kind = p_kind
    AND attempted_at > now() - make_interval(mins => GREATEST(p_window_minutes, 1));

  RETURN v_count > p_max_attempts;
END;
$fn$;

REVOKE ALL ON FUNCTION public.record_public_payment_attempt(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_payment_attempt(text, text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.publish_walk_in_payment(
  p_amount numeric,
  p_customer_name text,
  p_origin text,
  p_customer_email text DEFAULT NULL,
  p_order_reference text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_settings public.walk_in_payment_settings%ROWTYPE;
  v_id uuid;
  v_email text := NULLIF(BTRIM(COALESCE(p_customer_email, '')), '');
  v_token text;
  v_code text;
  v_expires timestamptz;
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_attempt integer := 0;
  i integer;
BEGIN
  IF v_actor IS NULL OR NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'A staff edit role is required to take a walk-in payment.';
  END IF;
  IF p_origin NOT IN ('assisted_link', 'email_request') THEN
    RAISE EXCEPTION 'publish_walk_in_payment only publishes assisted_link or email_request payments.';
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
  IF p_origin = 'email_request' AND v_email IS NULL THEN
    RAISE EXCEPTION 'An email address is required to send a payment request.';
  END IF;

  SELECT * INTO v_settings FROM public.walk_in_payment_settings WHERE id;

  v_expires := CASE
    WHEN p_origin = 'email_request'
      THEN now() + make_interval(hours => v_settings.email_link_ttl_hours)
    ELSE now() + make_interval(mins => v_settings.claim_code_ttl_minutes)
  END;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_id := gen_random_uuid();

  LOOP
    v_attempt := v_attempt + 1;
    v_code := '';
    IF p_origin = 'assisted_link' THEN
      FOR i IN 1..6 LOOP
        v_code := v_code || substr(v_alphabet, (get_byte(extensions.gen_random_bytes(1), 0) % 32) + 1, 1);
      END LOOP;
    END IF;

    BEGIN
      INSERT INTO public.walk_in_payments (
        id, created_by, customer_name, customer_email, order_reference, reason,
        amount, payment_reference, origin, link_token_hash, claim_code_hash,
        link_expires_at, published_at, contact_id
      ) VALUES (
        v_id, v_actor, BTRIM(p_customer_name), v_email,
        NULLIF(BTRIM(COALESCE(p_order_reference, '')), ''),
        NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
        ROUND(p_amount, 2), 'WALKIN-' || v_id::text, p_origin,
        encode(extensions.digest(v_token, 'sha256'), 'hex'),
        CASE WHEN p_origin = 'assisted_link'
          THEN encode(extensions.digest(v_code, 'sha256'), 'hex') END,
        v_expires, now(), p_contact_id
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_id,
    'payment_reference', 'WALKIN-' || v_id::text,
    'token', v_token,
    'claim_code', NULLIF(v_code, ''),
    'expires_at', v_expires
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.publish_walk_in_payment(numeric, text, text, text, text, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_walk_in_payment(numeric, text, text, text, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_walk_in_payment_link(
  p_token text DEFAULT NULL,
  p_claim_code text DEFAULT NULL,
  p_redeem boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  payment_reference text,
  customer_name text,
  customer_email text,
  amount numeric,
  currency text,
  reason text,
  origin text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $fn$
DECLARE
  v_row public.walk_in_payments%ROWTYPE;
  v_code text;
BEGIN
  IF p_token IS NOT NULL AND BTRIM(p_token) <> '' THEN
    SELECT * INTO v_row FROM public.walk_in_payments
    WHERE link_token_hash = encode(extensions.digest(BTRIM(p_token), 'sha256'), 'hex')
    FOR UPDATE;
  ELSIF p_claim_code IS NOT NULL AND BTRIM(p_claim_code) <> '' THEN
    v_code := translate(upper(regexp_replace(p_claim_code, '[^A-Za-z0-9]', '', 'g')), 'ILOU', '1100');
    IF char_length(v_code) <> 6 THEN RETURN; END IF;
    SELECT * INTO v_row FROM public.walk_in_payments
    WHERE claim_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
      AND status = 'pending'
      AND token_used_at IS NULL
    FOR UPDATE;
  ELSE
    RETURN;
  END IF;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_row.status <> 'pending' THEN RETURN; END IF;
  IF v_row.link_expires_at IS NULL OR v_row.link_expires_at < now() THEN RETURN; END IF;
  IF v_row.token_used_at IS NOT NULL THEN RETURN; END IF;

  UPDATE public.walk_in_payments
  SET claim_attempts = claim_attempts + 1,
      token_used_at = CASE WHEN p_redeem THEN now() ELSE token_used_at END
  WHERE public.walk_in_payments.id = v_row.id;

  RETURN QUERY SELECT
    v_row.id, v_row.payment_reference, v_row.customer_name, v_row.customer_email,
    v_row.amount, v_row.currency, v_row.reason, v_row.origin;
END;
$fn$;

REVOKE ALL ON FUNCTION public.resolve_walk_in_payment_link(text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_walk_in_payment_link(text, text, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.create_self_serve_walk_in_payment(
  p_amount numeric,
  p_customer_name text,
  p_customer_email text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $fn$
DECLARE
  v_settings public.walk_in_payment_settings%ROWTYPE;
  v_id uuid := gen_random_uuid();
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_email text := NULLIF(BTRIM(COALESCE(p_customer_email, '')), '');
BEGIN
  SELECT * INTO v_settings FROM public.walk_in_payment_settings WHERE id;

  IF NOT v_settings.self_serve_enabled THEN
    RAISE EXCEPTION 'Self-service payments are currently unavailable.';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_customer_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Please enter your name.';
  END IF;
  IF p_amount IS NULL
    OR ROUND(p_amount, 2) < v_settings.self_serve_min_amount
    OR ROUND(p_amount, 2) > v_settings.self_serve_max_amount THEN
    RAISE EXCEPTION 'Enter an amount between % and %.',
      v_settings.self_serve_min_amount, v_settings.self_serve_max_amount;
  END IF;
  IF v_email IS NOT NULL AND v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Please provide a valid email address.';
  END IF;

  INSERT INTO public.walk_in_payments (
    id, created_by, customer_name, customer_email, reason, amount,
    payment_reference, origin, link_token_hash, link_expires_at,
    published_at, needs_matching
  ) VALUES (
    v_id,
    NULL,
    BTRIM(p_customer_name), v_email,
    NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    ROUND(p_amount, 2), 'WALKIN-' || v_id::text, 'self_serve',
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    now() + interval '30 minutes', now(), true
  );

  RETURN jsonb_build_object(
    'id', v_id,
    'payment_reference', 'WALKIN-' || v_id::text,
    'token', v_token
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_self_serve_walk_in_payment(numeric, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_self_serve_walk_in_payment(numeric, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.match_walk_in_payment(
  p_payment_id uuid,
  p_order_reference text DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'A staff edit role is required to match a payment.';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_order_reference, '')), '') IS NULL AND p_contact_id IS NULL THEN
    RAISE EXCEPTION 'Provide an order reference or a contact to match this payment to.';
  END IF;

  UPDATE public.walk_in_payments
  SET order_reference = COALESCE(NULLIF(BTRIM(COALESCE(p_order_reference, '')), ''), order_reference),
      contact_id = COALESCE(p_contact_id, contact_id),
      needs_matching = false,
      matched_by = v_actor,
      matched_at = now()
  WHERE id = p_payment_id AND needs_matching;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That payment is not waiting to be matched.';
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.match_walk_in_payment(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_walk_in_payment(uuid, text, uuid) TO authenticated;

ALTER TABLE public.walk_in_payments REPLICA IDENTITY FULL;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'walk_in_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.walk_in_payments;
  END IF;
END;
$do$;