CREATE OR REPLACE FUNCTION public.log_gatekeeper_dispatch(
  p_action text,
  p_success boolean,
  p_phase text DEFAULT 'gatekeeper_call',
  p_order_kind text DEFAULT NULL,
  p_submission_id uuid DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_http_method text DEFAULT NULL,
  p_http_status integer DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_request jsonb DEFAULT '{}'::jsonb,
  p_response jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_alert boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.gatekeeper_dispatch_logs (
    action, order_kind, submission_id, phase, success, endpoint, http_method,
    http_status, duration_ms, request_snapshot, response_snapshot, error_message, actor_user_id
  ) VALUES (
    p_action, p_order_kind, p_submission_id, coalesce(p_phase, 'gatekeeper_call'), coalesce(p_success, false),
    p_endpoint, p_http_method, p_http_status, p_duration_ms,
    coalesce(p_request, '{}'::jsonb), coalesce(p_response, '{}'::jsonb), p_error_message, p_actor_user_id
  )
  RETURNING id INTO v_id;

  IF coalesce(p_alert, false) AND NOT coalesce(p_success, false) THEN
    BEGIN
      INSERT INTO public.admin_notifications (event_type, severity, title, message, href, metadata, related_user_id)
      VALUES (
        'gatekeeper.dispatch_failed',
        'error',
        'Gatekeeper dispatch failed',
        coalesce(p_error_message, 'Gatekeeper request failed') ||
          coalesce(' (HTTP ' || p_http_status::text || ')', ''),
        '/admin/settings/integrations',
        jsonb_build_object(
          'log_id', v_id,
          'action', p_action,
          'order_kind', p_order_kind,
          'submission_id', p_submission_id,
          'phase', p_phase,
          'endpoint', p_endpoint,
          'http_status', p_http_status,
          'response', coalesce(p_response, '{}'::jsonb)
        ),
        p_actor_user_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'gatekeeper dispatch alert failed: %', SQLERRM;
    END;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_gatekeeper_dispatch(text, boolean, text, text, uuid, text, text, integer, integer, jsonb, jsonb, text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_gatekeeper_dispatch(text, boolean, text, text, uuid, text, text, integer, integer, jsonb, jsonb, text, uuid, boolean) TO service_role;