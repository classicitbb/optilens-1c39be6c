-- Preserve the full posted-statement shape needed by the customer portal.
ALTER TABLE public.statements
  ADD COLUMN IF NOT EXISTS transactions numeric,
  ADD COLUMN IF NOT EXISTS allowance numeric,
  ADD COLUMN IF NOT EXISTS volume_discount numeric;

ALTER TABLE public.statement_lines
  ADD COLUMN IF NOT EXISTS order_id bigint,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS order_type_name text;

-- The gateway request queue is intentionally allow-listed. Rx order status is
-- sourced from Innovations, not from the OptiLens shipment database.
ALTER TABLE public.live_data_gateway_requests
  DROP CONSTRAINT IF EXISTS live_data_gateway_requests_operation_check;

ALTER TABLE public.live_data_gateway_requests
  ADD CONSTRAINT live_data_gateway_requests_operation_check
  CHECK (operation IN (
    'innovations.customer_account',
    'innovations.customer_statement',
    'innovations.customer_rx_order_status',
    'optilens.customer_deliveries'
  ));
