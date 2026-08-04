DROP POLICY IF EXISTS "Role users can select quote_frame_details" ON public.quote_frame_details;

DROP POLICY IF EXISTS "Role users can select rx_order_submissions" ON public.rx_order_submissions;

CREATE POLICY "Staff can select rx_order_submissions"
  ON public.rx_order_submissions
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Customers manage own rx quote lines" ON public.quote_lines;

CREATE POLICY "Customers insert own rx quote lines"
  ON public.quote_lines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_lines.quote_id
        AND q.created_by = auth.uid()
        AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    )
  );

CREATE POLICY "Customers update own rx quote lines"
  ON public.quote_lines
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "Customers delete own rx quote lines"
  ON public.quote_lines
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_lines.quote_id
        AND q.created_by = auth.uid()
        AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    )
  );

CREATE OR REPLACE FUNCTION public.get_customer_quote_lines(p_quote_id uuid)
RETURNS TABLE (
  id uuid,
  quote_id uuid,
  line_type text,
  product_id uuid,
  sku text,
  item_name text,
  description_override text,
  qty numeric,
  unit_sell_price_bbd numeric,
  group_key text,
  parent_line_id uuid,
  sort_order integer,
  line_note text,
  needs_assistance boolean,
  assistance_note text,
  innovations_alias text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ql.id,
    ql.quote_id,
    ql.line_type,
    ql.product_id,
    ql.sku,
    ql.item_name,
    ql.description_override,
    ql.qty,
    ql.unit_sell_price_bbd,
    ql.group_key,
    ql.parent_line_id,
    ql.sort_order,
    ql.line_note,
    ql.needs_assistance,
    ql.assistance_note,
    ql.innovations_alias,
    ql.created_at,
    ql.updated_at
  FROM public.quote_lines ql
  JOIN public.quotes q ON q.id = ql.quote_id
  WHERE ql.quote_id = p_quote_id
    AND q.created_by = auth.uid()
    AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
  ORDER BY ql.sort_order;
$$;

REVOKE ALL ON FUNCTION public.get_customer_quote_lines(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_customer_quote_lines(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_customer_quote_lines(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_quote_lines(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';