-- Run only as one transaction; fixture rows and setting changes always roll back.
BEGIN;
CREATE TEMP TABLE stock_order_submissions (status text, dispatch_provider text, auto_transmit boolean DEFAULT false, payload jsonb, quote_id uuid, last_error text, approved_at timestamptz);
CREATE TRIGGER fixture_prepare BEFORE INSERT ON stock_order_submissions FOR EACH ROW EXECUTE FUNCTION public.prepare_automatic_gatekeeper_submission();
DO $test$ DECLARE flag boolean; BEGIN
  UPDATE public.order_dispatch_settings SET auto_transmit=true WHERE id;
  INSERT INTO pg_temp.stock_order_submissions(status,dispatch_provider,payload) VALUES('approved','gatekeeper','{"source":"store_checkout"}');
  SELECT auto_transmit INTO flag FROM pg_temp.stock_order_submissions LIMIT 1;
  IF flag IS DISTINCT FROM true THEN RAISE EXCEPTION 'Paid store checkout was not opted into Gatekeeper dispatch'; END IF;
  DELETE FROM pg_temp.stock_order_submissions;
  UPDATE public.order_dispatch_settings SET auto_transmit=false WHERE id;
  INSERT INTO pg_temp.stock_order_submissions(status,dispatch_provider,payload) VALUES('staged','gatekeeper','{"source":"store_checkout"}');
  SELECT auto_transmit INTO flag FROM pg_temp.stock_order_submissions LIMIT 1;
  IF flag IS DISTINCT FROM false THEN RAISE EXCEPTION 'Manual-mode store checkout was opted in'; END IF;
END $test$;
ROLLBACK;
