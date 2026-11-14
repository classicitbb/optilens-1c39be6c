-- Staff-only, all-customer live-data operations (lab work-in-progress and
-- shipments across every customer). These requests are not tied to one
-- customer, so website_customer_id must be nullable for them.
-- The edge function enforces: staff-only, and website_customer_id is NULL
-- exactly when the operation is one of the all-customer operations.

ALTER TABLE public.live_data_gateway_requests
  ALTER COLUMN website_customer_id DROP NOT NULL;

ALTER TABLE public.live_data_gateway_requests
  DROP CONSTRAINT IF EXISTS live_data_gateway_requests_operation_check;

ALTER TABLE public.live_data_gateway_requests
  ADD CONSTRAINT live_data_gateway_requests_operation_check
  CHECK (operation = ANY (ARRAY[
    'innovations.customer_account',
    'innovations.customer_statement',
    'innovations.customer_invoice',
    'innovations.customer_rx_order_status',
    'innovations.customer_orders',
    'optilens.customer_deliveries',
    'innovations.all_orders',
    'optilens.all_deliveries'
  ]));

ALTER TABLE public.live_data_gateway_requests
  DROP CONSTRAINT IF EXISTS live_data_gateway_requests_customer_scope_check;

ALTER TABLE public.live_data_gateway_requests
  ADD CONSTRAINT live_data_gateway_requests_customer_scope_check
  CHECK ((website_customer_id IS NULL) = (operation IN ('innovations.all_orders', 'optilens.all_deliveries')));
