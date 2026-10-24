-- Rx order data model, Phase 0 (part 6): one feature gate for Rx writes.
--
-- Found 2026-10-01 against the live policies: the 'rx-order' opt-in
-- (20261001120000) only gated the form's UI. At the database a customer with
-- the ordinary 'quotes' feature could still INSERT/UPDATE quote_type='RX'
-- quotes, and the frame / Rx-detail child tables checked 'quotes' only — so
-- switching 'rx-order' off did not actually stop Rx writes.
--
-- Now, for NON-staff writers:
--   · an RX quote (and its lines, Rx details, frame details) needs 'rx-order'
--   · any other quote still needs 'quotes', exactly as before
-- Reads keep the old either-feature rule so customers can still see Rx orders
-- they already placed. Staff policies are untouched (has_edit_role).

CREATE OR REPLACE FUNCTION public.can_write_customer_quote(p_quote_type text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_quote_type = 'RX' THEN public.can_access_customer_portal_feature(p_user_id, 'rx-order')
    ELSE public.can_access_customer_portal_feature(p_user_id, 'quotes')
  END;
$$;
REVOKE ALL ON FUNCTION public.can_write_customer_quote(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_customer_quote(text, uuid) TO authenticated, service_role;

-- ── quotes ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Customers create own portal quotes" ON public.quotes;
CREATE POLICY "Customers create own portal quotes"
  ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_write_customer_quote(quote_type)
    AND (account_id IS NULL OR public.can_access_portal_account(account_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Customers update own portal quotes" ON public.quotes;
CREATE POLICY "Customers update own portal quotes"
  ON public.quotes FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.can_write_customer_quote(quote_type))
  WITH CHECK (
    created_by = auth.uid()
    AND (account_id IS NULL OR public.can_access_portal_account(account_id, auth.uid()))
  );

-- ── quote_lines ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Customers manage lines on own quotes" ON public.quote_lines;
DROP POLICY IF EXISTS "Customers read lines on own quotes" ON public.quote_lines;
DROP POLICY IF EXISTS "Customers write lines on own quotes" ON public.quote_lines;

CREATE POLICY "Customers read lines on own quotes"
  ON public.quote_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_lines.quote_id AND q.created_by = auth.uid()
      AND (public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
           OR public.can_access_customer_portal_feature(auth.uid(), 'quotes'))
  ));

CREATE POLICY "Customers write lines on own quotes"
  ON public.quote_lines FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_lines.quote_id AND q.created_by = auth.uid()
      AND public.can_write_customer_quote(q.quote_type)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_lines.quote_id AND q.created_by = auth.uid()
      AND public.can_write_customer_quote(q.quote_type)
  ));

-- ── rx_details ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Customers can view own rx details" ON public.rx_details;
DROP POLICY IF EXISTS "Customers manage own rx details" ON public.rx_details;

CREATE POLICY "Customers can view own rx details"
  ON public.rx_details FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quote_lines ql JOIN public.quotes q ON q.id = ql.quote_id
    WHERE ql.id = rx_details.quote_line_id AND q.created_by = auth.uid()
      AND (public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
           OR public.can_access_customer_portal_feature(auth.uid(), 'quotes'))
  ));

CREATE POLICY "Customers manage own rx details"
  ON public.rx_details FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quote_lines ql JOIN public.quotes q ON q.id = ql.quote_id
    WHERE ql.id = rx_details.quote_line_id AND q.created_by = auth.uid()
      AND public.can_write_customer_quote(q.quote_type)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quote_lines ql JOIN public.quotes q ON q.id = ql.quote_id
    WHERE ql.id = rx_details.quote_line_id AND q.created_by = auth.uid()
      AND public.can_write_customer_quote(q.quote_type)
  ));

-- ── quote_frame_details ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Customers manage own rx frame details" ON public.quote_frame_details;
DROP POLICY IF EXISTS "Customers read own rx frame details" ON public.quote_frame_details;
DROP POLICY IF EXISTS "Customers write own rx frame details" ON public.quote_frame_details;

CREATE POLICY "Customers read own rx frame details"
  ON public.quote_frame_details FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_frame_details.quote_id AND q.created_by = auth.uid()
      AND (public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
           OR public.can_access_customer_portal_feature(auth.uid(), 'quotes'))
  ));

CREATE POLICY "Customers write own rx frame details"
  ON public.quote_frame_details FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_frame_details.quote_id AND q.created_by = auth.uid()
      AND public.can_write_customer_quote(q.quote_type)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_frame_details.quote_id AND q.created_by = auth.uid()
      AND public.can_write_customer_quote(q.quote_type)
  ));
