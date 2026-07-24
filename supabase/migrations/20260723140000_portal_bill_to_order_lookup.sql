-- A customer portal normally finds lab orders by the account they were
-- shipped to.  A head office can instead opt into the orders billed to its
-- account, which safely includes its branches without exposing statements to
-- branch users.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS portal_orders_use_bill_to_account boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_portal_erp_order_lookup()
RETURNS TABLE (
  account_number text,
  portal_orders_use_bill_to_account boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NULLIF(BTRIM(c.account_number::text), '') AS account_number,
    COALESCE(c.portal_orders_use_bill_to_account, false) AS portal_orders_use_bill_to_account
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_portal_erp_order_lookup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_portal_erp_order_lookup() TO authenticated;
