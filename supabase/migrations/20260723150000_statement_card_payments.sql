-- ============================================================
-- Statement / account-balance card payments (Scotia eCom+)
-- ------------------------------------------------------------
-- Orders settle via settle_scotia_payment(); statement payments are not tied
-- to an order, so they get their own ledger table + recording RPC. The
-- response hash is validated by the `scotia-payment` Edge Function BEFORE
-- the RPC is called; p_gateway carries only verified, whitelisted fields.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.account_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crm_customer_id integer,
  account_number text,
  statement_id text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT '840',
  provider text NOT NULL DEFAULT 'scotia',
  status text NOT NULL CHECK (status IN ('settled', 'failed')),
  gateway_oid text,
  gateway_response_code text,
  gateway_fail_rc text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_payments_user_idx ON public.account_payments(user_id);
CREATE INDEX IF NOT EXISTS account_payments_gateway_oid_idx
  ON public.account_payments(gateway_oid) WHERE gateway_oid IS NOT NULL;

ALTER TABLE public.account_payments ENABLE ROW LEVEL SECURITY;

-- Owners see their own payments; staff (edit role) see all.
DROP POLICY IF EXISTS "Read own or staff account_payments" ON public.account_payments;
CREATE POLICY "Read own or staff account_payments"
  ON public.account_payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_edit_role(auth.uid()));

-- Writes go exclusively through the SECURITY DEFINER RPC below.
DROP POLICY IF EXISTS "No direct writes to account_payments" ON public.account_payments;
CREATE POLICY "No direct writes to account_payments"
  ON public.account_payments FOR ALL
  TO authenticated
  USING (false) WITH CHECK (false);

-- ── Record a verified gateway outcome ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.settle_statement_payment(
  p_amount numeric,
  p_statement_id text DEFAULT NULL,
  p_crm_customer_id integer DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_gateway jsonb DEFAULT '{}'::jsonb,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
  v_approved boolean := COALESCE((p_gateway ->> 'approved')::boolean, false);
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  -- Non-admins may only record payments for themselves.
  IF v_actor <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to record this payment.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'settle_statement_payment requires a positive amount';
  END IF;

  INSERT INTO public.account_payments (
    user_id, crm_customer_id, account_number, statement_id, amount, currency,
    provider, status, gateway_oid, gateway_response_code, gateway_fail_rc
  ) VALUES (
    v_actor,
    p_crm_customer_id,
    NULLIF(BTRIM(COALESCE(p_account_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_statement_id, '')), ''),
    ROUND(p_amount, 2),
    COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'currency', '')), ''), '840'),
    'scotia',
    CASE WHEN v_approved THEN 'settled' ELSE 'failed' END,
    NULLIF(BTRIM(COALESCE(p_gateway ->> 'oid', '')), ''),
    NULLIF(BTRIM(COALESCE(p_gateway ->> 'association_response_code', '')), ''),
    NULLIF(BTRIM(COALESCE(p_gateway ->> 'fail_rc', '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.settle_statement_payment(numeric, text, integer, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_statement_payment(numeric, text, integer, text, jsonb, uuid) TO authenticated;
