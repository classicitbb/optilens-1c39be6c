
CREATE OR REPLACE FUNCTION public.get_all_orders_admin(
  p_status_filter text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  status text,
  total_amount numeric,
  checkout_method text,
  customer_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz,
  updated_at timestamptz,
  payment_status text,
  payment_provider text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and operators can view all orders.';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.user_id,
    o.status,
    o.total_amount,
    o.checkout_method,
    o.customer_name,
    o.contact_email,
    o.contact_phone,
    o.created_at,
    o.updated_at,
    p.status AS payment_status,
    p.provider AS payment_provider
  FROM public.orders o
  LEFT JOIN LATERAL (
    SELECT op.status, op.provider
    FROM public.order_payments op
    WHERE op.order_id = o.id
    ORDER BY op.created_at DESC
    LIMIT 1
  ) p ON true
  WHERE (p_status_filter IS NULL OR o.status = p_status_filter)
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_orders_admin(text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_pending_payment(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and operators can approve payments.';
  END IF;

  UPDATE public.orders
  SET status = 'confirmed', updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.order_payments
  SET status = 'settled', updated_at = now()
  WHERE order_id = p_order_id
    AND id = (
      SELECT id FROM public.order_payments
      WHERE order_id = p_order_id
      ORDER BY created_at DESC
      LIMIT 1
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_pending_payment(uuid) TO authenticated;
