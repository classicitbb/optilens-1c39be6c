-- Link a shipment costing line to the Innovations Rx order it was bought for.
-- The order's lens-only sell total (sell price x qty, lens lines only) drives
-- the line's Sell (BBD); markup is derived from it against landed cost.
ALTER TABLE public.shipment_lines
  ADD COLUMN IF NOT EXISTS innovations_order_id bigint,
  ADD COLUMN IF NOT EXISTS linked_sell_total_bbd numeric;

CREATE OR REPLACE FUNCTION public.lookup_innovations_order_lens_total(p_order_id bigint)
RETURNS TABLE (lens_lines integer, lens_total_bbd numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_any_role(auth.uid()), false) THEN
    RAISE EXCEPTION 'Not authorised.';
  END IF;
  RETURN QUERY
    SELECT count(ql.id)::integer, COALESCE(sum(ql.unit_sell_price_bbd * ql.qty), 0)::numeric
    FROM public.rx_order_submissions s
    JOIN public.quote_lines ql ON ql.quote_id = s.quote_id AND ql.line_type = 'Lens'
    WHERE s.gatekeeper_order_id = p_order_id;
END $$;

REVOKE ALL ON FUNCTION public.lookup_innovations_order_lens_total(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_innovations_order_lens_total(bigint) TO authenticated;
NOTIFY pgrst, 'reload schema';
