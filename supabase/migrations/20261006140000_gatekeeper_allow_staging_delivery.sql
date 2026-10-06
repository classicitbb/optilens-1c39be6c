-- Allow outbound Gatekeeper delivery on a connected STAGING credential so the
-- Rx/stock order flow can be tested end to end against Ocuco's sandbox.
--
-- Before: enabling delivery (or polling) required environment = 'production'.
-- After:  enabling delivery requires a connected credential in either
--         environment; enabling lab-status polling still requires production,
--         because the status endpoints and the cron pull only run there
--         (gatekeeper-orders `pull-statuses` returns production_connection_required).
--
-- Routing is unchanged: orders default to dispatch_provider = 'innovations' and
-- only reach Gatekeeper when staff choose it at release, so enabling delivery on
-- staging cannot reroute normal orders. The edge function already targets the
-- staging base URL from the stored environment.

CREATE OR REPLACE FUNCTION public.set_gatekeeper_delivery_route(
  p_contract_id uuid,
  p_enabled boolean,
  p_status_poll_enabled boolean DEFAULT false,
  p_fallback_to_innovations boolean DEFAULT true,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := CASE
    WHEN auth.role() = 'service_role' THEN COALESCE(p_actor_user_id, auth.uid())
    ELSE auth.uid()
  END;
  v_settings_id uuid;
  v_environment text;
  v_has_credentials boolean;
BEGIN
  IF NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'Only admins can update Gatekeeper delivery settings.';
  END IF;

  SELECT id, environment, has_credentials
  INTO v_settings_id, v_environment, v_has_credentials
  FROM public.gatekeeper_settings
  WHERE tenant_key = 'default';

  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.gatekeeper_contracts
    WHERE id = p_contract_id AND settings_id = v_settings_id
  ) THEN
    RAISE EXCEPTION 'Select a current Gatekeeper contract.';
  END IF;

  IF (p_enabled OR p_status_poll_enabled) AND NOT v_has_credentials THEN
    RAISE EXCEPTION 'Gatekeeper delivery and status polling require a connected Gatekeeper credential.';
  END IF;

  IF p_status_poll_enabled AND v_environment <> 'production' THEN
    RAISE EXCEPTION 'Gatekeeper status polling requires a connected production credential.';
  END IF;

  UPDATE public.gatekeeper_contracts
  SET is_active = (id = p_contract_id), updated_at = now()
  WHERE settings_id = v_settings_id;

  UPDATE public.gatekeeper_settings
  SET enabled = p_enabled,
      status_poll_enabled = p_status_poll_enabled,
      fallback_to_innovations = p_fallback_to_innovations,
      status_pull_failure_count = CASE WHEN p_status_poll_enabled THEN status_pull_failure_count ELSE 0 END,
      status_pull_next_attempt_at = CASE WHEN p_status_poll_enabled THEN status_pull_next_attempt_at ELSE NULL END,
      status_poll_degraded_at = CASE WHEN p_status_poll_enabled THEN status_poll_degraded_at ELSE NULL END,
      updated_at = now()
  WHERE id = v_settings_id;
END;
$$;
