-- The public Rx form writes a customer-owned quote, its lines, prescription,
-- and frame data directly. The original schema only granted those writes to
-- staff, so a portal user could create the draft header but could not save or
-- submit the form. These policies are deliberately limited to the caller's
-- own quote and preserve the existing feature entitlement check.

CREATE POLICY "Customers manage own rx quotes"
  ON public.quotes FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
  )
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
  );

CREATE POLICY "Customers read own rx quotes"
  ON public.quotes FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
  );

CREATE POLICY "Customers manage own rx quote lines"
  ON public.quote_lines FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_lines.quote_id
        AND q.created_by = auth.uid()
        AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_lines.quote_id
        AND q.created_by = auth.uid()
        AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    )
  );

CREATE POLICY "Customers manage own rx frame details"
  ON public.quote_frame_details FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_frame_details.quote_id
        AND q.created_by = auth.uid()
        AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_frame_details.quote_id
        AND q.created_by = auth.uid()
        AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    )
  );

CREATE POLICY "Customers manage own rx details"
  ON public.rx_details FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quote_lines ql
      JOIN public.quotes q ON q.id = ql.quote_id
      WHERE ql.id = rx_details.quote_line_id
        AND q.created_by = auth.uid()
        AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quote_lines ql
      JOIN public.quotes q ON q.id = ql.quote_id
      WHERE ql.id = rx_details.quote_line_id
        AND q.created_by = auth.uid()
        AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    )
  );

-- A card checkout creates the confirmed order before it inserts its
-- order_items. The existing orders trigger therefore sees no Rx metadata and
-- never queues the submission. Keep that trigger for pending -> confirmed
-- transitions, and also enqueue when an Rx-marked line is inserted into an
-- already-confirmed order.
CREATE OR REPLACE FUNCTION public.enqueue_rx_submission_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id uuid;
BEGIN
  IF COALESCE(NEW.variant_metadata ->> 'rx_quote_id', '') !~* '^[0-9a-f-]{36}$' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = NEW.order_id AND status = 'confirmed'
  ) THEN
    RETURN NEW;
  END IF;

  v_quote_id := (NEW.variant_metadata ->> 'rx_quote_id')::uuid;
  INSERT INTO public.rx_order_submissions (quote_id, order_id, account_id, status, payload)
  SELECT v_quote_id, NEW.order_id, q.account_id, 'pending_review',
         public.build_rx_submission_payload(v_quote_id)
  FROM public.quotes q
  WHERE q.id = v_quote_id
  ON CONFLICT (quote_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_enqueue_rx_submissions ON public.order_items;
CREATE TRIGGER order_items_enqueue_rx_submissions
  AFTER INSERT OR UPDATE OF variant_metadata ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_rx_submission_for_order_item();

-- The original payload builder falls back to a lens's primary alias. That is
-- useful for an uncoloured legacy quote, but unsafe for this form: a selected
-- finish can otherwise be submitted as the primary (often clear) colour. The
-- browser stores an exact match before this gate; if none exists, staff must
-- correct the mapping instead of releasing the wrong production instruction.
CREATE OR REPLACE FUNCTION public.approve_rx_submission(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can approve Rx submissions.';
  END IF;

  SELECT quote_id INTO v_quote_id
  FROM public.rx_order_submissions
  WHERE id = p_id AND status IN ('pending_review','failed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in an approvable state.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quote_lines
    WHERE quote_id = v_quote_id
      AND line_type = 'Lens'
      AND innovations_alias IS NULL
  ) THEN
    RAISE EXCEPTION
      'Every selected lens colour needs a confirmed Innovations alias before release.';
  END IF;

  UPDATE public.rx_order_submissions
  SET status = 'approved',
      payload = public.build_rx_submission_payload(quote_id),
      approved_by = auth.uid(), approved_at = now(), last_error = NULL
  WHERE id = p_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
