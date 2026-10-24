-- Staff-reviewed photo captures skip the cart: the reviewed quote goes straight
-- into the Rx submission outbox (pending_review = "Ready to release").
CREATE OR REPLACE FUNCTION public.submit_reviewed_rx_capture(p_job_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id uuid;
  v_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff editors can submit reviewed captures.';
  END IF;

  SELECT quote_id INTO v_quote_id FROM public.rx_capture_jobs WHERE id = p_job_id;
  IF v_quote_id IS NULL THEN
    RAISE EXCEPTION 'Save the reviewed order before submitting it.';
  END IF;

  INSERT INTO public.rx_order_submissions (quote_id, account_id, status, payload)
  SELECT q.id, q.account_id, 'pending_review', public.build_rx_submission_payload(q.id)
  FROM public.quotes q WHERE q.id = v_quote_id
  ON CONFLICT (quote_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.rx_order_submissions WHERE quote_id = v_quote_id;
  END IF;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_reviewed_rx_capture(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_reviewed_rx_capture(uuid) TO authenticated;