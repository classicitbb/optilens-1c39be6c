CREATE TABLE IF NOT EXISTS public.gatekeeper_dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  order_kind text,
  submission_id uuid,
  phase text NOT NULL DEFAULT 'gatekeeper_call',
  success boolean NOT NULL DEFAULT false,
  endpoint text,
  http_method text,
  http_status integer,
  duration_ms integer,
  request_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gatekeeper_dispatch_logs_created_idx ON public.gatekeeper_dispatch_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS gatekeeper_dispatch_logs_submission_idx ON public.gatekeeper_dispatch_logs (submission_id, created_at DESC);

GRANT SELECT ON public.gatekeeper_dispatch_logs TO authenticated;
GRANT ALL ON public.gatekeeper_dispatch_logs TO service_role;

ALTER TABLE public.gatekeeper_dispatch_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view gatekeeper dispatch logs" ON public.gatekeeper_dispatch_logs;
CREATE POLICY "Staff can view gatekeeper dispatch logs"
ON public.gatekeeper_dispatch_logs
FOR SELECT
TO authenticated
USING (public.has_staff_role(auth.uid()));

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
    INSERT INTO public.admin_notifications (event_type, severity, title, message, href, metadata, related_user_id)
    VALUES (
      'gatekeeper.dispatch_failed',
      'critical',
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
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_gatekeeper_dispatch(text, boolean, text, text, uuid, text, text, integer, integer, jsonb, jsonb, text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_gatekeeper_dispatch(text, boolean, text, text, uuid, text, text, integer, integer, jsonb, jsonb, text, uuid, boolean) TO service_role;