-- ============================================================
-- FIX: statement/balance card payments were charging the raw BBD
-- statement figure as if it were USD, with zero conversion. Statements
-- come from the Innovations ERP in Barbados dollars (see Profile.tsx's
-- "BBD $" balance label); the Scotia gateway only ever charges USD
-- (account_payments.currency already defaulted to '840' = USD). A
-- customer paying off a BBD 939.71 balance was about to be charged
-- USD 939.71 by card — roughly double what they owe, since BBD is
-- pegged to USD at a fixed ~2:1 rate.
--
-- This uses the SAME authoritative rate the rest of the pricing engine
-- already uses (pricing_settings.fx_rates->>'USD', "1 USD = N BBD" —
-- see src/features/rx-order/pricing/currencies.ts and
-- src/components/admin/CurrencyFxSection.tsx) rather than hardcoding a
-- new constant, so a single admin-configured rate stays the one source
-- of truth. pricing_settings is staff-only (RLS), so the conversion
-- must happen server-side in this SECURITY DEFINER function — a
-- customer's browser cannot read that table directly.
-- ============================================================

-- amount_bbd: the statement-currency amount being paid off (what the
-- customer sees as "their balance"). amount stays the actual USD amount
-- captured by the card network — those are two different numbers and
-- conflating them into one `amount` column is exactly the bug being fixed.
ALTER TABLE public.account_payments
  ADD COLUMN IF NOT EXISTS amount_bbd numeric(12,2),
  ADD COLUMN IF NOT EXISTS fx_rate_bbd_per_usd numeric(12,6);

COMMENT ON COLUMN public.account_payments.amount IS 'Actual USD amount captured by the card network.';
COMMENT ON COLUMN public.account_payments.amount_bbd IS 'Statement/balance-currency (BBD) amount this payment pays off.';
COMMENT ON COLUMN public.account_payments.fx_rate_bbd_per_usd IS 'pricing_settings.fx_rates->>''USD'' at the time this payment was created (BBD per 1 USD) — kept for the receipt/audit trail.';

DROP FUNCTION IF EXISTS public.create_pending_statement_payment(numeric, text, integer, text, uuid);

CREATE OR REPLACE FUNCTION public.create_pending_statement_payment(
  p_amount numeric, -- BBD: the statement/balance amount the customer is paying off
  p_statement_id text DEFAULT NULL,
  p_crm_customer_id integer DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(payment_id uuid, amount_usd numeric, amount_bbd numeric, fx_rate_bbd_per_usd numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
  v_fx_rate numeric; -- BBD per 1 USD, e.g. 2.00
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

  SELECT (ps.fx_rates ->> 'USD')::numeric INTO v_fx_rate
  FROM public.pricing_settings ps
  WHERE ps.is_active = true
  ORDER BY ps.version DESC
  LIMIT 1;

  IF v_fx_rate IS NULL OR v_fx_rate <= 0 THEN
    RAISE EXCEPTION 'No active USD exchange rate is configured — card payments are unavailable until Pricing Settings has one.';
  END IF;

  v_amount_usd := ROUND(p_amount / v_fx_rate, 2);
  IF v_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Converted payment amount must be greater than zero.';
  END IF;

  INSERT INTO public.account_payments (
    user_id, crm_customer_id, account_number, statement_id,
    amount, amount_bbd, fx_rate_bbd_per_usd, currency, status
  ) VALUES (
    v_actor,
    p_crm_customer_id,
    NULLIF(BTRIM(COALESCE(p_account_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_statement_id, '')), ''),
    v_amount_usd,
    ROUND(p_amount, 2),
    v_fx_rate,
    '840',
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_amount_usd, ROUND(p_amount, 2), v_fx_rate;
END; $$;

REVOKE ALL ON FUNCTION public.create_pending_statement_payment(numeric, text, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pending_statement_payment(numeric, text, integer, text, uuid) TO authenticated;

-- ── Public-safe FX rate read ─────────────────────────────────────────────
-- pricing_settings is staff-only (internal costing/margin fields live in the
-- same row), so the statements UI cannot select it directly to show a
-- "you'll be charged $X USD" preview before the customer commits to paying.
-- This exposes only the one number a customer-facing preview needs.
CREATE OR REPLACE FUNCTION public.get_active_usd_fx_rate()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (ps.fx_rates ->> 'USD')::numeric
  FROM public.pricing_settings ps
  WHERE ps.is_active = true
  ORDER BY ps.version DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_usd_fx_rate() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_usd_fx_rate() TO authenticated;
