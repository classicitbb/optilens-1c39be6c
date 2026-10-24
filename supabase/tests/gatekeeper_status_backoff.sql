BEGIN;

SELECT plan(1);

DO $$
DECLARE
  v_state record;
  v_definition text;
BEGIN
  UPDATE public.gatekeeper_settings
  SET status_poll_enabled = false,
      status_pull_failure_count = 0,
      status_pull_next_attempt_at = NULL,
      status_poll_degraded_at = NULL
  WHERE tenant_key = 'default';

  DELETE FROM public.admin_notifications
  WHERE event_type = 'gatekeeper.status_poll_degraded';

  SELECT * INTO v_state FROM public.record_gatekeeper_status_pull_outcome(false, 'HTTP 503');
  IF v_state.failure_count <> 1
     OR v_state.next_attempt_at < now() + interval '14 minutes'
     OR v_state.next_attempt_at > now() + interval '16 minutes'
     OR NOT v_state.entered_degraded_state THEN
    RAISE EXCEPTION 'first status failure did not create 15 minute degraded state';
  END IF;

  SELECT * INTO v_state FROM public.record_gatekeeper_status_pull_outcome(false, 'HTTP 503');
  IF v_state.failure_count <> 2
     OR v_state.next_attempt_at < now() + interval '29 minutes'
     OR v_state.next_attempt_at > now() + interval '31 minutes'
     OR v_state.entered_degraded_state THEN
    RAISE EXCEPTION 'second status failure did not create 30 minute backoff';
  END IF;

  IF (SELECT count(*) FROM public.admin_notifications WHERE event_type = 'gatekeeper.status_poll_degraded') <> 1 THEN
    RAISE EXCEPTION 'status outage notification was not deduplicated';
  END IF;

  PERFORM * FROM public.record_gatekeeper_status_pull_outcome(false, 'HTTP 503');
  PERFORM * FROM public.record_gatekeeper_status_pull_outcome(false, 'HTTP 503');
  PERFORM * FROM public.record_gatekeeper_status_pull_outcome(false, 'HTTP 503');
  SELECT * INTO v_state FROM public.record_gatekeeper_status_pull_outcome(false, 'HTTP 503');
  IF v_state.failure_count <> 6
     OR v_state.next_attempt_at < now() + interval '359 minutes'
     OR v_state.next_attempt_at > now() + interval '361 minutes' THEN
    RAISE EXCEPTION 'status backoff was not capped at six hours';
  END IF;

  SELECT * INTO v_state FROM public.record_gatekeeper_status_pull_outcome(true, NULL);
  IF v_state.failure_count <> 0 OR v_state.next_attempt_at IS NOT NULL
     OR (SELECT status_poll_degraded_at FROM public.gatekeeper_settings WHERE tenant_key = 'default') IS NOT NULL THEN
    RAISE EXCEPTION 'successful status pull did not reset degraded state';
  END IF;

  IF has_function_privilege('anon', 'public.requeue_gatekeeper_rx_to_innovations(uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.requeue_gatekeeper_rx_to_innovations(uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.requeue_gatekeeper_rx_to_innovations(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'fallback RPC grants are not service-role only';
  END IF;

  SELECT pg_get_functiondef('public.requeue_gatekeeper_rx_to_innovations(uuid,text)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%status = ''claimed''%'
     OR v_definition NOT LIKE '%dispatch_provider = ''gatekeeper''%'
     OR v_definition LIKE '%stock_order_submissions%' THEN
    RAISE EXCEPTION 'fallback RPC is not narrowly scoped to claimed Gatekeeper Rx rows';
  END IF;
END;
$$;

SELECT pass('Gatekeeper backoff, alert deduplication, and fallback grants are safe');
SELECT * FROM finish();

ROLLBACK;
