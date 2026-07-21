-- get_customer_command_center is SECURITY DEFINER and read balance,
-- statement, and pricelist data straight from balances_public /
-- statements_public / pricelist_versions with no access check at all —
-- unlike every other surface for this data (RLS on those tables, and
-- StatementsSection/AssignedPricelistsSection client-side) it ignored both
-- the tri-state customer_portal_feature_overrides row and the
-- Approved-Access-to-* contact tags. A customer with Statements/Pricelists
-- explicitly disabled could still see their balance and assigned pricelist
-- name on the command-center dashboard. Gate both blocks the same way the
-- rest of the portal already does, via can_access_customer_portal_feature.

CREATE OR REPLACE FUNCTION public.get_customer_command_center()
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
  IF v_profile.crm_customer_id IS NOT NULL THEN
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
