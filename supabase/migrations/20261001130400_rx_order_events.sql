-- Rx order data model, Phase 0 (part 5): one event log for the Rx lifecycle.
--
--   draft → submitted → in review → released → sent to lab → lab statuses
--
-- save_rx_order and the outbox write here; the customer timeline (Phase 2),
-- the admin workspace (Phase 3) and the capture queue (Phase 4) read it.
-- Staff read everything; customers get a safe projection later through a
-- SECURITY DEFINER RPC, never this table directly (detail may hold internals).
CREATE TABLE IF NOT EXISTS public.rx_order_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id      uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.rx_order_submissions(id) ON DELETE SET NULL,
  actor_id      uuid,
  event         text NOT NULL,
  from_status   text,
  to_status     text,
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rx_order_events_quote_idx ON public.rx_order_events (quote_id, created_at);

ALTER TABLE public.rx_order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read rx order events" ON public.rx_order_events;
CREATE POLICY "Staff read rx order events"
  ON public.rx_order_events FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
-- No write policies: rows come from definer functions and the trigger below.

CREATE OR REPLACE FUNCTION public.log_rx_order_event(
  p_quote_id uuid, p_event text, p_from text DEFAULT NULL, p_to text DEFAULT NULL,
  p_detail jsonb DEFAULT '{}'::jsonb, p_submission_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.rx_order_events (quote_id, submission_id, actor_id, event, from_status, to_status, detail)
  VALUES (p_quote_id, p_submission_id, auth.uid(), p_event, p_from, p_to, COALESCE(p_detail, '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.log_rx_order_event(uuid, text, text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;

-- Outbox transitions: one event per submission created or status change.
CREATE OR REPLACE FUNCTION public.log_rx_submission_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_rx_order_event(NEW.quote_id, 'submitted', NULL, NEW.status,
      jsonb_build_object('order_id', NEW.order_id), NEW.id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_rx_order_event(NEW.quote_id, 'submission_' || NEW.status, OLD.status, NEW.status,
      CASE WHEN NEW.last_error IS NOT NULL THEN jsonb_build_object('error', NEW.last_error) ELSE '{}'::jsonb END,
      NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rx_order_submissions_log_event ON public.rx_order_submissions;
CREATE TRIGGER rx_order_submissions_log_event
  AFTER INSERT OR UPDATE OF status ON public.rx_order_submissions
  FOR EACH ROW EXECUTE FUNCTION public.log_rx_submission_event();
