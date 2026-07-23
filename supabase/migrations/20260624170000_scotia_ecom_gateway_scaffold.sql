-- ============================================================
-- Scotia eCom+ (IPG Connect) gateway — additive scaffold
-- ------------------------------------------------------------
-- NON-BREAKING. Only widens CHECK constraints and adds nullable columns so
-- the gateway can be wired up later. No data is migrated, no defaults change,
-- and the existing 'demo' / offline / on-account flows keep working as the
-- permanent fallback.
-- ============================================================

-- 1. Allow the 'scotia' provider for saved tokenized cards (hosteddataid).
--    Existing rows are 'demo' and remain valid.
ALTER TABLE public.customer_payment_methods
  DROP CONSTRAINT IF EXISTS customer_payment_methods_provider_check;

ALTER TABLE public.customer_payment_methods
  ADD CONSTRAINT customer_payment_methods_provider_check
  CHECK (provider IN ('demo', 'scotia'));

-- 2. Allow the 'scotia' provider on order_payments too.
ALTER TABLE public.order_payments
  DROP CONSTRAINT IF EXISTS order_payments_provider_check;

-- Includes 'google_pay' and 'manual' (written by the checkout RPCs since
-- migration 20260321153000). NOT VALID → enforced for new rows only, so
-- legacy rows with other provider values never block this migration.
ALTER TABLE public.order_payments
  ADD CONSTRAINT order_payments_provider_check
  CHECK (provider IN ('demo', 'scotia', 'stripe', 'firstpay', 'bimpay', 'on_account', 'google_pay', 'manual'))
  NOT VALID;

-- 3. Gateway reconciliation fields (all nullable → safe to add to live data).
--    * gateway_oid              → the `oid` we send and the gateway echoes back
--    * gateway_response_code    → association response code (e.g. "00", "51")
--    * gateway_fail_rc          → internal error code (fail_rc) when present
--    * gateway_hosteddataid     → token returned when assignToken=true
ALTER TABLE public.order_payments
  ADD COLUMN IF NOT EXISTS gateway_oid text,
  ADD COLUMN IF NOT EXISTS gateway_response_code text,
  ADD COLUMN IF NOT EXISTS gateway_fail_rc text,
  ADD COLUMN IF NOT EXISTS gateway_hosteddataid text;

CREATE INDEX IF NOT EXISTS order_payments_gateway_oid_idx
  ON public.order_payments(gateway_oid)
  WHERE gateway_oid IS NOT NULL;

-- NOTE: place_customer_order() is intentionally NOT modified here. Settling a
-- Scotia transaction (authorize → settle, persisting the fields above and the
-- returned token) belongs to the "full integration" phase and is specced in
-- docs/scotia-ecom-hosted-payment-integration.md.
