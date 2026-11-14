-- Staff can retire an unpaid published link or emailed request.
--
-- Staff only have SELECT on walk_in_payments, so a cancel has to be a
-- SECURITY DEFINER function. A cancelled link uses the same convention the
-- resend path already uses: status 'failed' and an expired link, which stops
-- the token resolving.
--
-- Three cases are refused on purpose:
--   * the customer has already started paying (token_used_at is set). A
--     settlement result for a 'failed' row is ignored by settle_walk_in_payment,
--     so cancelling mid-payment could take the customer's money without
--     recording it.
--   * payments that belong to an order supplementary invoice. Those must stay
--     payable; cancelling one would leave the order shipment-held for good.
--   * anything that is not a published link or emailed request.
CREATE OR REPLACE FUNCTION public.cancel_walk_in_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_payment public.walk_in_payments%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'A staff edit role is required to cancel a payment link.';
  END IF;

  SELECT * INTO v_payment FROM public.walk_in_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found.';
  END IF;
  IF v_payment.origin NOT IN ('assisted_link', 'email_request') THEN
    RAISE EXCEPTION 'Only published links and emailed requests can be cancelled.';
  END IF;
  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Only unpaid links can be cancelled.';
  END IF;
  IF v_payment.token_used_at IS NOT NULL THEN
    RAISE EXCEPTION 'The customer has already started paying. Wait for the result.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_extra_invoices WHERE payment_id = p_payment_id) THEN
    RAISE EXCEPTION 'This payment belongs to an order invoice and cannot be cancelled here.';
  END IF;

  UPDATE public.walk_in_payments
  SET status = 'failed', link_expires_at = now()
  WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_walk_in_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_walk_in_payment(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
