-- Add explicit polling controls, durable outage state, and a narrowly scoped
-- pre-send fallback for prescription orders. Existing staging credentials are
-- intentionally left untouched and polling starts disabled.

ALTER TABLE public.gatekeeper_settings
  ADD COLUMN IF NOT EXISTS status_poll_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallback_to_innovations boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status_pull_failure_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_pull_next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_poll_degraded_at timestamptz;

-- A staging credential must never remain an active production route. The
-- credential itself is preserved for audit/reconnection; operators must use a
-- fresh production PIN before enabling either outbound delivery or polling.
UPDATE public.gatekeeper_settings
SET enabled = false,
    status_poll_enabled = false,
    updated_at = now()
WHERE environment <> 'production';

ALTER TABLE public.gatekeeper_settings
  DROP CONSTRAINT IF EXISTS gatekeeper_settings_status_pull_failure_count_check;
ALTER TABLE public.gatekeeper_settings
  ADD CONSTRAINT gatekeeper_settings_status_pull_failure_count_check
  CHECK (status_pull_failure_count >= 0);

-- Reconnecting to a different Gatekeeper environment is a credential change,
-- not a route switch. Force an explicit administrator enable after the fresh
-- connection has been stored so a former production route cannot become active
-- against staging (or vice versa) as a side effect of reconnecting.
CREATE OR REPLACE FUNCTION public.disable_gatekeeper_route_on_environment_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.environment IS DISTINCT FROM OLD.environment THEN
    NEW.enabled := false;
    NEW.status_poll_enabled := false;
    NEW.status_pull_failure_count := 0;
    NEW.status_pull_next_attempt_at := NULL;
    NEW.status_poll_degraded_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.disable_gatekeeper_route_on_environment_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS gatekeeper_settings_disable_route_on_environment_change
  ON public.gatekeeper_settings;
CREATE TRIGGER gatekeeper_settings_disable_route_on_environment_change
BEFORE UPDATE OF environment ON public.gatekeeper_settings
FOR EACH ROW
EXECUTE FUNCTION public.disable_gatekeeper_route_on_environment_change();

ALTER TABLE public.rx_order_submissions
  ADD COLUMN IF NOT EXISTS dispatch_fallback_from text,
  ADD COLUMN IF NOT EXISTS dispatch_fallback_reason text,
  ADD COLUMN IF NOT EXISTS dispatch_fallback_at timestamptz;

DROP FUNCTION IF EXISTS public.set_gatekeeper_delivery_route(uuid, boolean, uuid);
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

  IF (p_enabled OR p_status_poll_enabled) AND (v_environment <> 'production' OR NOT v_has_credentials) THEN
    RAISE EXCEPTION 'Gatekeeper delivery and status polling require a connected production credential.';
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

REVOKE ALL ON FUNCTION public.set_gatekeeper_delivery_route(uuid, boolean, boolean, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_gatekeeper_delivery_route(uuid, boolean, boolean, boolean, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.begin_gatekeeper_status_pull(boolean);
CREATE FUNCTION public.begin_gatekeeper_status_pull(p_force boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.gatekeeper_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings
  FROM public.gatekeeper_settings
  WHERE tenant_key = 'default'
  FOR UPDATE;

  IF NOT FOUND
     OR NOT v_settings.status_poll_enabled
     OR NOT v_settings.enabled
     OR v_settings.environment <> 'production'
     OR NOT v_settings.has_credentials
     OR (v_settings.status_pull_next_attempt_at IS NOT NULL
         AND v_settings.status_pull_next_attempt_at > now()) THEN
    RETURN false;
  END IF;

  IF NOT p_force
     AND v_settings.last_status_pull_at IS NOT NULL
     AND v_settings.last_status_pull_at > now() - interval '5 minutes' THEN
    RETURN false;
  END IF;

  UPDATE public.gatekeeper_settings
  SET last_status_pull_at = now(), updated_at = now()
  WHERE id = v_settings.id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_gatekeeper_status_pull(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_gatekeeper_status_pull(boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.record_gatekeeper_status_pull_outcome(
  p_success boolean,
  p_error_message text DEFAULT NULL
)
RETURNS TABLE(
  failure_count integer,
  next_attempt_at timestamptz,
  entered_degraded_state boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.gatekeeper_settings%ROWTYPE;
  v_failure_count integer;
  v_delay_minutes integer;
  v_entered boolean := false;
BEGIN
  SELECT * INTO v_settings
  FROM public.gatekeeper_settings
  WHERE tenant_key = 'default'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gatekeeper settings are not configured.';
  END IF;

  IF p_success THEN
    UPDATE public.gatekeeper_settings
    SET status_pull_failure_count = 0,
        status_pull_next_attempt_at = NULL,
        status_poll_degraded_at = NULL,
        last_status_success_at = now(),
        last_error = NULL,
        updated_at = now()
    WHERE id = v_settings.id;
    RETURN QUERY SELECT 0, NULL::timestamptz, false;
    RETURN;
  END IF;

  v_failure_count := v_settings.status_pull_failure_count + 1;
  v_delay_minutes := CASE v_failure_count
    WHEN 1 THEN 15
    WHEN 2 THEN 30
    WHEN 3 THEN 60
    WHEN 4 THEN 120
    WHEN 5 THEN 240
    ELSE 360
  END;
  v_entered := v_settings.status_poll_degraded_at IS NULL;
  failure_count := v_failure_count;
  next_attempt_at := now() + make_interval(mins => v_delay_minutes);

  UPDATE public.gatekeeper_settings
  SET status_pull_failure_count = v_failure_count,
      status_pull_next_attempt_at = next_attempt_at,
      status_poll_degraded_at = COALESCE(status_poll_degraded_at, now()),
      last_error = LEFT(COALESCE(NULLIF(BTRIM(p_error_message), ''), 'Gatekeeper status feed is temporarily unavailable.'), 500),
      updated_at = now()
  WHERE id = v_settings.id;

  IF v_entered THEN
    INSERT INTO public.admin_notifications (
      event_type, severity, title, message, href, metadata
    ) VALUES (
      'gatekeeper.status_poll_degraded',
      'warning',
      'Gatekeeper status refresh paused',
      'Gatekeeper is temporarily unavailable. Existing order statuses were retained and automatic refresh is backing off.',
      '/admin/settings/integrations',
      jsonb_build_object('failure_count', v_failure_count, 'next_attempt_at', next_attempt_at)
    );
  END IF;

  entered_degraded_state := v_entered;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.record_gatekeeper_status_pull_outcome(boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_gatekeeper_status_pull_outcome(boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.requeue_gatekeeper_rx_to_innovations(
  p_submission_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rx_order_submissions
  SET status = 'approved',
      dispatch_provider = 'innovations',
      claimed_at = NULL,
      last_error = NULL,
      dispatch_fallback_from = 'gatekeeper',
      dispatch_fallback_reason = LEFT(COALESCE(NULLIF(BTRIM(p_reason), ''), 'Gatekeeper unavailable before send.'), 500),
      dispatch_fallback_at = now(),
      updated_at = now()
  WHERE id = p_submission_id
    AND status = 'claimed'
    AND dispatch_provider = 'gatekeeper';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.requeue_gatekeeper_rx_to_innovations(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_gatekeeper_rx_to_innovations(uuid, text) TO service_role;

COMMENT ON FUNCTION public.requeue_gatekeeper_rx_to_innovations(uuid, text) IS
  'Requeues only claimed Rx Gatekeeper submissions before any lab POST. The frozen payload is preserved; delivery remains pending until the local worker reports file_drop.';

NOTIFY pgrst, 'reload schema';
