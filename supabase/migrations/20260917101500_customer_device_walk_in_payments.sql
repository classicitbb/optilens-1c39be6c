-- Customer-device walk-in payments.
--
-- Adds three ways for the customer to pay on their own phone instead of
-- handing a card across the counter:
--   assisted_link  staff publish a payment; customer scans the counter QR and
--                  types a short claim code the cashier reads out
--   email_request  staff email a one-time tokenised pay link
--   self_serve     customer scans the QR and enters their own amount
--
-- Link tokens and claim codes are stored only as SHA-256 hashes. A database
-- dump or an over-broad SELECT must not yield a working pay link. The plaintext
-- is returned exactly once, to the staff member who published it or in the
-- request email.
--
-- No cardholder PAN, CVV, expiry or token is accepted by this table; card entry
-- stays on the Scotia/Fiserv hosted page exactly as before.

-- ── Currency correction ────────────────────────────────────────────────────
-- The table has always pinned currency to '840' (USD) while the edge function
-- signs '052' (BBD), the UI prints BBD and the receipt email renders the raw
-- string "840". '052' is what is actually charged, so that is the truth.
ALTER TABLE public.walk_in_payments
  DROP CONSTRAINT IF EXISTS walk_in_payments_currency_check;

UPDATE public.walk_in_payments SET currency = '052' WHERE currency <> '052';

ALTER TABLE public.walk_in_payments
  ALTER COLUMN currency SET DEFAULT '052';

ALTER TABLE public.walk_in_payments
  ADD CONSTRAINT walk_in_payments_currency_check CHECK (currency = '052');

-- ── Customer-device columns ────────────────────────────────────────────────
ALTER TABLE public.walk_in_payments
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'staff_terminal',
  ADD COLUMN IF NOT EXISTS link_token_hash text,
  ADD COLUMN IF NOT EXISTS claim_code_hash text,
  ADD COLUMN IF NOT EXISTS link_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS needs_matching boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matched_by uuid,
  ADD COLUMN IF NOT EXISTS matched_at timestamptz;

-- A self-serve payment has no staff actor at all. Rather than attributing it to
-- an arbitrary staff member, created_by is NULL and the row is flagged for
-- matching; every other origin still requires a real actor.
ALTER TABLE public.walk_in_payments ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.walk_in_payments
  DROP CONSTRAINT IF EXISTS walk_in_payments_created_by_required_check;

ALTER TABLE public.walk_in_payments
  ADD CONSTRAINT walk_in_payments_created_by_required_check
  CHECK (created_by IS NOT NULL OR origin = 'self_serve');

ALTER TABLE public.walk_in_payments
  DROP CONSTRAINT IF EXISTS walk_in_payments_origin_check;

ALTER TABLE public.walk_in_payments
  ADD CONSTRAINT walk_in_payments_origin_check
  CHECK (origin IN ('staff_terminal', 'assisted_link', 'email_request', 'self_serve'));

-- A staff-terminal payment is created and paid on the shop's own device, so it
-- never carries a token. Every customer-device origin must.
ALTER TABLE public.walk_in_payments
  DROP CONSTRAINT IF EXISTS walk_in_payments_link_token_required_check;

ALTER TABLE public.walk_in_payments
  ADD CONSTRAINT walk_in_payments_link_token_required_check
  CHECK (
    (origin = 'staff_terminal' AND link_token_hash IS NULL)
    OR (origin <> 'staff_terminal' AND link_token_hash IS NOT NULL AND link_expires_at IS NOT NULL)
  );

-- Hash lookups are the hot path for the public resolve/start calls.
CREATE UNIQUE INDEX IF NOT EXISTS walk_in_payments_link_token_hash_idx
  ON public.walk_in_payments (link_token_hash) WHERE link_token_hash IS NOT NULL;

-- Claim codes are only unique among live, unredeemed assisted links; a code is
-- free to be reissued once its payment has expired or been paid.
CREATE UNIQUE INDEX IF NOT EXISTS walk_in_payments_live_claim_code_idx
  ON public.walk_in_payments (claim_code_hash)
  WHERE claim_code_hash IS NOT NULL AND status = 'pending' AND token_used_at IS NULL;

CREATE INDEX IF NOT EXISTS walk_in_payments_needs_matching_idx
  ON public.walk_in_payments (created_at DESC) WHERE needs_matching;

-- ── Self-serve configuration (singleton) ───────────────────────────────────
-- Follows the dhl_express_settings precedent: one row, staff read, admin write.
CREATE TABLE IF NOT EXISTS public.walk_in_payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  self_serve_enabled boolean NOT NULL DEFAULT true,
  self_serve_min_amount numeric(12,2) NOT NULL DEFAULT 20.00 CHECK (self_serve_min_amount > 0),
  self_serve_max_amount numeric(12,2) NOT NULL DEFAULT 500.00 CHECK (self_serve_max_amount > 0),
  claim_code_ttl_minutes integer NOT NULL DEFAULT 30 CHECK (claim_code_ttl_minutes BETWEEN 5 AND 1440),
  email_link_ttl_hours integer NOT NULL DEFAULT 72 CHECK (email_link_ttl_hours BETWEEN 1 AND 720),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT walk_in_payment_settings_amount_order CHECK (self_serve_max_amount >= self_serve_min_amount)
);

INSERT INTO public.walk_in_payment_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_walk_in_payment_settings_updated_at
  ON public.walk_in_payment_settings;

CREATE TRIGGER update_walk_in_payment_settings_updated_at
  BEFORE UPDATE ON public.walk_in_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.walk_in_payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read walk-in payment settings" ON public.walk_in_payment_settings;
CREATE POLICY "Staff can read walk-in payment settings"
  ON public.walk_in_payment_settings FOR SELECT TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can update walk-in payment settings" ON public.walk_in_payment_settings;
CREATE POLICY "Admins can update walk-in payment settings"
  ON public.walk_in_payment_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.walk_in_payment_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.walk_in_payment_settings TO authenticated;
GRANT ALL ON TABLE public.walk_in_payment_settings TO service_role;

-- ── Durable rate limiting for the public endpoints ─────────────────────────
-- _shared/http/rateLimit.ts is per-isolate memory and resets on every cold
-- start, so it cannot bound a public endpoint that signs real gateway forms.
-- It stays as a cheap first gate; this table is the one that actually counts.
-- IPs are stored hashed — we need to count them, not know them.
CREATE TABLE IF NOT EXISTS public.public_payment_attempts (
  id bigserial PRIMARY KEY,
  ip_hash text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('claim', 'self_serve')),
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_payment_attempts_window_idx
  ON public.public_payment_attempts (ip_hash, kind, attempted_at DESC);

ALTER TABLE public.public_payment_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_payment_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.public_payment_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.public_payment_attempts_id_seq TO service_role;

-- Counts this attempt and reports whether the caller is now over the limit.
-- Also prunes rows older than the window so the table stays small without a
-- scheduled job.
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
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.record_public_payment_attempt(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_payment_attempt(text, text, integer, integer) TO service_role;

-- ── Staff publishes a customer-device payment ──────────────────────────────
-- Returns the token and claim code in plaintext EXACTLY ONCE. Only their
-- hashes are stored, so neither can be recovered from the table afterwards.
-- Re-publishing overwrites the hashes, which invalidates the previous link by
-- construction.
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
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_settings public.walk_in_payment_settings%ROWTYPE;
  v_id uuid;
  v_email text := NULLIF(BTRIM(COALESCE(p_customer_email, '')), '');
  v_token text;
  v_code text;
  v_expires timestamptz;
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; -- Crockford: no I, L, O, U
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

  -- Only assisted links carry a typeable code. 32^6 is ~1.07e9, so a collision
  -- among the handful of codes live at any moment is vanishingly unlikely; the
  -- retry loop exists so that a collision is still handled rather than raised.
  LOOP
    v_attempt := v_attempt + 1;
    v_code := '';
    IF p_origin = 'assisted_link' THEN
      FOR i IN 1..6 LOOP
        -- 256 is a multiple of 32, so this modulo is unbiased.
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
$$;

REVOKE ALL ON FUNCTION public.publish_walk_in_payment(numeric, text, text, text, text, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_walk_in_payment(numeric, text, text, text, text, text, uuid) TO authenticated;

-- ── Public resolve / redeem (service role only; the edge function fronts it) ─
-- `anon` never reads walk_in_payments directly. The walkin-pay Edge Function
-- resolves the token with the service role and returns only the four fields a
-- customer needs to recognise their own payment.
--
-- Expired, already-used, wrong and non-existent all return the same empty
-- result, so the public page cannot be used to test whether a code exists.
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
AS $$
DECLARE
  v_row public.walk_in_payments%ROWTYPE;
  v_code text;
BEGIN
  IF p_token IS NOT NULL AND BTRIM(p_token) <> '' THEN
    SELECT * INTO v_row FROM public.walk_in_payments
    WHERE link_token_hash = encode(extensions.digest(BTRIM(p_token), 'sha256'), 'hex')
    FOR UPDATE;
  ELSIF p_claim_code IS NOT NULL AND BTRIM(p_claim_code) <> '' THEN
    -- Normalise what a human typed off a printed slip: strip separators, and
    -- fold the Crockford look-alikes before hashing.
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
  -- A redeemed link is spent. Re-showing the confirm screen after the customer
  -- has already been sent to the gateway would let a forwarded link be replayed.
  IF v_row.token_used_at IS NOT NULL THEN RETURN; END IF;

  -- Counts how often this link was opened. It is a leak signal (one link being
  -- resolved repeatedly), not a brute-force guard: a wrong code matches no row,
  -- so guessing is bounded per-IP by record_public_payment_attempt instead.
  UPDATE public.walk_in_payments
  SET claim_attempts = claim_attempts + 1,
      token_used_at = CASE WHEN p_redeem THEN now() ELSE token_used_at END
  WHERE public.walk_in_payments.id = v_row.id;

  RETURN QUERY SELECT
    v_row.id, v_row.payment_reference, v_row.customer_name, v_row.customer_email,
    v_row.amount, v_row.currency, v_row.reason, v_row.origin;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_walk_in_payment_link(text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_walk_in_payment_link(text, text, boolean) TO service_role;

-- ── Self-serve intent (service role only) ──────────────────────────────────
-- Enforces the kill switch and the amount bounds in the database, so a caller
-- that bypasses the Edge Function's own checks still cannot create an
-- out-of-bounds intent.
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
AS $$
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
    NULL, -- nobody on staff was involved; needs_matching is what they act on
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
$$;

REVOKE ALL ON FUNCTION public.create_self_serve_walk_in_payment(numeric, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_self_serve_walk_in_payment(numeric, text, text, text) TO service_role;

-- ── Staff clears a self-serve payment from the unassigned queue ────────────
CREATE OR REPLACE FUNCTION public.match_walk_in_payment(
  p_payment_id uuid,
  p_order_reference text DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.match_walk_in_payment(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_walk_in_payment(uuid, text, uuid) TO authenticated;

-- ── Realtime ───────────────────────────────────────────────────────────────
-- The cashier's screen must flip to PAID the moment settlement commits, so
-- they know to hand over the glasses. Staff already have SELECT on this table,
-- and postgres_changes honours RLS, so nobody who cannot already read a walk-in
-- payment can receive one.
ALTER TABLE public.walk_in_payments REPLICA IDENTITY FULL;

DO $$
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
$$;

-- ── PostgREST schema cache ─────────────────────────────────────────────────
-- Five new RPCs are added above. Without this, the Data API keeps serving its
-- cached schema and every one of them answers
--   "Could not find the function public.<name>(...) in the schema cache"
-- for up to ~10 minutes after the DDL has already committed. 97 migrations in
-- this repository end with this line for exactly that reason.
NOTIFY pgrst, 'reload schema';
