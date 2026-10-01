-- Rx order test bench: a test quote can never reach a lab.
--
-- Staff test saves are tagged quotes.is_test (save_rx_order, p_is_test) and the
-- bench never places an order. This is the backstop: if a test quote were ever
-- put on an order, its outbox row is silently not created, so nothing could be
-- reviewed, released to Innovations / Gatekeeper, or counted in reports.
-- (BEFORE INSERT returning NULL skips the row without failing the order.)
CREATE OR REPLACE FUNCTION public.skip_test_quote_rx_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = NEW.quote_id AND q.is_test) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rx_order_submissions_skip_test ON public.rx_order_submissions;
CREATE TRIGGER rx_order_submissions_skip_test
  BEFORE INSERT ON public.rx_order_submissions
  FOR EACH ROW EXECUTE FUNCTION public.skip_test_quote_rx_submission();
