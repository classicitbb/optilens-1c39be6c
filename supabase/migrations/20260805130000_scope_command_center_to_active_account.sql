-- get_customer_command_center resolved the customer strictly from
-- profiles.crm_customer_id (the single default-account pointer), so the
-- dashboard's "Welcome, {account}" heading, current balance, latest
-- statement, and assigned-pricelist name never followed the account
-- switcher (see 20260804194006_portal_multi_account_memberships.sql /
-- 20260805120000_scope_portal_pricing_to_active_account.sql for the same
-- fix applied to the pricing RPCs).
--
-- Orders, drafts, and helpdesk tickets are deliberately left scoped by
-- user_id/owner_user_id here — those tables have no customer_id column in
-- the current schema, so they are the LOGIN's own records, not the
-- currently-active account's. Tickets staying login-scoped matches the
-- intended design; making orders/drafts account-scoped would need a real
-- schema change (a customer_id column and a backfill decision), not a query
-- fix, so that is intentionally out of scope here.

DROP FUNCTION IF EXISTS public.get_customer_command_center();
CREATE FUNCTION public.get_customer_command_center(p_customer_id integer DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_orders jsonb;
  v_drafts jsonb;
  v_tickets jsonb;
  v_balance jsonb;
  v_statement jsonb;
  v_pricelist jsonb;
  v_innovations_as_of timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user_id;

  IF p_customer_id IS NOT NULL AND public.can_access_portal_account(p_customer_id, v_user_id) THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id;
  ELSIF v_profile.crm_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = v_profile.crm_customer_id;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', o.id, 'status', o.status, 'total_amount', o.total_amount,
    'created_at', o.created_at, 'updated_at', o.updated_at, 'checkout_method', o.checkout_method
  ) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_orders FROM (SELECT * FROM public.orders WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 12) o;

  SELECT COALESCE(jsonb_agg(draft ORDER BY draft->>'updated_at' DESC), '[]'::jsonb)
  INTO v_drafts
  FROM (
    SELECT jsonb_build_object('id', id, 'kind', 'cart', 'name', name, 'status', 'draft', 'updated_at', updated_at) AS draft
    FROM public.cart_drafts WHERE user_id = v_user_id
    UNION ALL
    SELECT jsonb_build_object('id', id, 'kind', 'rx', 'name', name, 'status', status, 'updated_at', updated_at) AS draft
    FROM public.rx_order_drafts WHERE user_id = v_user_id
  ) drafts;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id, 'ticket_number', t.ticket_number, 'title', t.title,
    'closed_at', t.closed_at, 'created_at', t.created_at
  ) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_tickets
  FROM (
    SELECT * FROM public.helpdesk_tickets
    WHERE owner_user_id = v_user_id OR (v_profile.crm_contact_id IS NOT NULL AND partner_contact_id = v_profile.crm_contact_id)
    ORDER BY created_at DESC LIMIT 8
  ) t;

  IF v_customer.id IS NOT NULL AND public.can_access_customer_portal_feature(v_user_id, 'statements') THEN
    SELECT to_jsonb(b) INTO v_balance FROM public.balances_public b WHERE b.customer_id = v_customer.id LIMIT 1;
    SELECT to_jsonb(s) INTO v_statement FROM public.statements_public s WHERE s.customer_id = v_customer.id ORDER BY s.period_end DESC LIMIT 1;
  END IF;

  IF v_customer.id IS NOT NULL AND public.can_access_customer_portal_feature(v_user_id, 'pricelists') THEN
    SELECT jsonb_build_object('id', p.id, 'name', p.name, 'updated_at', p.updated_at)
      INTO v_pricelist FROM public.pricelist_versions p WHERE p.id = v_customer.assigned_pricelist_id;
  END IF;

  SELECT max(finished_at) INTO v_innovations_as_of
  FROM public.innovations_sync_runs
  WHERE status IN ('success','partial');

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'access_status', COALESCE(v_profile.portal_access_status, 'pending_profile'),
      'access_note', COALESCE(v_profile.portal_access_note, ''),
      'organization_name', v_profile.organization_name,
      'customer_name', v_customer.name
    ),
    'orders', v_orders,
    'drafts', v_drafts,
    'balance', v_balance,
    'latest_statement', v_statement,
    'tickets', v_tickets,
    'pricelist', v_pricelist,
    'sources', jsonb_build_object('innovations_as_of', v_innovations_as_of, 'website_as_of', now())
  );
END;
$function$;

NOTIFY pgrst, 'reload schema';
