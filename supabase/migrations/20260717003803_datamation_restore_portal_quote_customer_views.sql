-- Restore the customer-portal quote read models that are still used by
-- /profile/quotes. Keep them as security_invoker views so base-table RLS and
-- the portal feature gate remain part of the read path. Do not expose cost,
-- profit, or internal-note fields.

CREATE OR REPLACE VIEW public.quotes_customer
WITH (security_invoker = true) AS
SELECT
  id,
  quote_number,
  quote_type,
  status,
  customer_name,
  account_id,
  contact_name,
  contact_email,
  contact_phone,
  currency,
  valid_until,
  lead_time_days,
  notes_customer,
  subtotal_sell,
  grand_total,
  created_by,
  created_at,
  updated_at
FROM public.quotes
WHERE created_by = auth.uid()
  AND public.can_access_customer_portal_feature(auth.uid(), 'quotes');

CREATE OR REPLACE VIEW public.quote_lines_customer
WITH (security_invoker = true) AS
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
  ql.created_at,
  ql.updated_at
FROM public.quote_lines ql
WHERE EXISTS (
  SELECT 1
  FROM public.quotes q
  WHERE q.id = ql.quote_id
    AND q.created_by = auth.uid()
    AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
);

REVOKE ALL ON public.quotes_customer FROM PUBLIC;
REVOKE ALL ON public.quotes_customer FROM anon;
GRANT SELECT ON public.quotes_customer TO authenticated;

REVOKE ALL ON public.quote_lines_customer FROM PUBLIC;
REVOKE ALL ON public.quote_lines_customer FROM anon;
GRANT SELECT ON public.quote_lines_customer TO authenticated;

NOTIFY pgrst, 'reload schema';
