-- Instant Rx submission for credit-approved accounts.
--
-- A credit-approved practice ordering a prescription job has nothing to decide
-- at checkout: there is no payment to take, the shipping method is already on
-- the Rx form, and the order is placed on account. Routing them through the
-- cart adds three screens that only re-ask what the form already knows.
--
-- The obstacle is that public.place_customer_order() ends with
--   DELETE FROM public.cart_items WHERE user_id = p_target_user_id;
-- because it IS the checkout path — placing an order there means the cart has
-- just been bought. A direct Rx submission deliberately bypasses the cart, so
-- using that function as-is would silently destroy whatever else the customer
-- had waiting in it.
--
-- Rather than duplicate that function (profile upsert, address resolution,
-- order_payments + order_payment_events rows, and the rx_order_submissions
-- enqueue trigger all hang off it), this wrapper snapshots the cart, delegates,
-- and puts the cart back. It is one transaction, so no session ever observes
-- the intermediate state, and the reused function stays the single definition
-- of what placing an order means.
--
-- NOTE FOR DEPLOY: migration files pushed to git are NOT executed against the
-- live database. Apply this through the Lovable MCP query_database tool.

-- ── 1. Who qualifies ────────────────────────────────────────────────────────
-- Same source of truth the portal UI reads: sync_customer_portal_identity()
-- derives payment_terms from the 'credit_approved' contact tag, so the gate
-- here resolves the identical fact rather than a parallel notion of credit.
CREATE OR REPLACE FUNCTION public.is_credit_approved_portal_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.contact_tag_links l ON l.contact_id = p.crm_contact_id
    JOIN public.contact_tags t ON t.id = l.tag_id
    WHERE p.user_id = p_user_id
      AND p.portal_access_status = 'approved_customer'
      AND t.name = 'credit_approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_credit_approved_portal_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_credit_approved_portal_user(uuid) TO authenticated;

-- ── 2. The direct submission ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.place_rx_order_direct(
  p_items jsonb,
  p_checkout jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_cart jsonb;
  v_checkout jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to place an order.';
  END IF;

  -- The privilege, not a preference. A non-credit account that reaches this
  -- function (a crafted call, a stale client) is refused outright rather than
  -- quietly downgraded to the cart.
  IF NOT public.is_credit_approved_portal_user(v_user) THEN
    RAISE EXCEPTION 'Instant Rx submission is only available on credit-approved accounts.';
  END IF;

  -- Exactly one Rx job. This path exists to skip the basket, so it must never
  -- become a second, unaudited way to place a multi-item order.
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) <> 1 THEN
    RAISE EXCEPTION 'A direct Rx submission carries exactly one Rx job.';
  END IF;

  -- Without rx_quote_id the enqueue trigger on order_items cannot hand the job
  -- to the lab, so the order would be placed and then go nowhere.
  IF COALESCE(p_items -> 0 -> 'variant_metadata' ->> 'rx_quote_id', '') !~* '^[0-9a-f-]{36}$' THEN
    RAISE EXCEPTION 'A direct Rx submission must carry its rx_quote_id.';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
  INTO v_cart
  FROM public.cart_items c
  WHERE c.user_id = v_user;

  -- On account is the whole point of the privilege; never let the caller
  -- nominate a different settlement route through this door.
  v_checkout := COALESCE(p_checkout, '{}'::jsonb) || jsonb_build_object('checkout_method', 'on_account');

  v_order_id := public.place_customer_order(v_user, p_items, v_checkout, v_user);

  -- Restore the basket the delegated function just emptied.
  IF jsonb_array_length(v_cart) > 0 THEN
    INSERT INTO public.cart_items
    SELECT * FROM jsonb_populate_recordset(NULL::public.cart_items, v_cart);
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_rx_order_direct(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_rx_order_direct(jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.place_rx_order_direct(jsonb, jsonb) IS
  'Places a single Rx job straight onto a credit-approved account, bypassing the cart and leaving cart_items intact.';
