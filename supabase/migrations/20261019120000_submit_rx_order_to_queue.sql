-- Staff submit from the admin Rx form (/admin/orders/rx/new).
--
-- The admin form had no submit target of its own, so "Submit to cart" dropped the
-- order into the staff member's personal cart, and place_rx_order_direct() only
-- serves credit-approved portal accounts (it bills the signed-in user's own
-- account, not the account staff are ordering for). This is the same hand-off
-- submit_reviewed_rx_capture() performs for a reviewed photo capture, minus the
-- capture job: the saved quote enters the Rx outbox as pending_review, ready to
-- be released from the Rx Orders workspace.
--
-- NOTE FOR DEPLOY: migration files pushed to git are NOT executed against the
-- live database. Apply this through the Lovable MCP query_database tool.
CREATE OR REPLACE FUNCTION public.submit_rx_order_to_queue(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff editors can submit Rx orders.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotes WHERE id = p_quote_id AND quote_type = 'RX') THEN
    RAISE EXCEPTION 'Rx order not found.';
  END IF;
  INSERT INTO public.rx_order_submissions (quote_id, account_id, status, payload)
  SELECT q.id, q.account_id, 'pending_review', public.build_rx_submission_payload(q.id)
  FROM public.quotes q WHERE q.id = p_quote_id
  ON CONFLICT (quote_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.rx_order_submissions WHERE quote_id = p_quote_id;
  END IF;
  UPDATE public.quotes SET status = 'Sent', updated_at = now()
   WHERE id = p_quote_id AND status = 'Draft';
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_rx_order_to_queue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_rx_order_to_queue(uuid) TO authenticated;
