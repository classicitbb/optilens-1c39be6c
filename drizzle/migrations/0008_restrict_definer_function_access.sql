REVOKE EXECUTE ON FUNCTION public.get_scotia_credentials() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_dhl_express_credentials() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_document_ai_credentials() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_gatekeeper_credentials() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_gatekeeper_connection_credentials() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_ai_agent_credentials(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_lead_provider_credentials(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.build_rx_submission_payload(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_stock_submission_for_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scotia_credentials() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dhl_express_credentials() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_document_ai_credentials() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_gatekeeper_credentials() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_gatekeeper_connection_credentials() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_agent_credentials(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_lead_provider_credentials(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.build_rx_submission_payload(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_stock_submission_for_order(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.list_staff_names()
RETURNS TABLE(user_id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.user_id, COALESCE(NULLIF(p.display_name, ''), NULLIF(p.full_name, ''), p.email, 'Staff member')
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role IN ('admin', 'operator', 'viewer')
    AND EXISTS (SELECT 1 FROM public.user_roles me WHERE me.user_id = auth.uid()
                AND me.role IN ('admin','operator','viewer','office_admin','accountant'));
$$;
REVOKE EXECUTE ON FUNCTION public.list_staff_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_staff_names() TO authenticated, service_role;

DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.user_assigned_pricelist_version_ids(uuid)'::regprocedure);
  IF (length(d) - length(replace(d, 'AND c.assigned_pricelist_id IS NOT NULL', ''))) / length('AND c.assigned_pricelist_id IS NOT NULL') <> 2 THEN
    RAISE EXCEPTION 'user_assigned_pricelist_version_ids anchor not found'; END IF;
  EXECUTE replace(d, 'AND c.assigned_pricelist_id IS NOT NULL',
    'AND c.assigned_pricelist_id IS NOT NULL AND (p_user_id = auth.uid() OR public.has_edit_role(auth.uid()) OR auth.role() = ''service_role'')');

  d := pg_get_functiondef('public.get_portal_account_memberships(uuid)'::regprocedure);
  IF position('OR auth.uid() IS NULL' IN d) = 0 THEN RAISE EXCEPTION 'get_portal_account_memberships guard not found'; END IF;
  EXECUTE replace(d, 'OR auth.uid() IS NULL', 'OR auth.role() = ''service_role''');

  d := pg_get_functiondef('public.sync_customer_portal_identity(uuid)'::regprocedure);
  IF position('requires a user id''; END IF;' IN d) = 0 THEN RAISE EXCEPTION 'sync_customer_portal_identity anchor not found'; END IF;
  EXECUTE replace(d, 'requires a user id''; END IF;',
    'requires a user id''; END IF;
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION ''Not allowed to sync another user'' USING ERRCODE = ''42501'';
  END IF;');
END
$do$;
REVOKE EXECUTE ON FUNCTION public.user_assigned_pricelist_version_ids(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_portal_account_memberships(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_customer_portal_identity(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.helpdesk_visible_contact_ids(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recommend_lenses(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_assigned_pricelist_version_ids(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_portal_account_memberships(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_customer_portal_identity(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.helpdesk_visible_contact_ids(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recommend_lenses(jsonb) TO authenticated, service_role;