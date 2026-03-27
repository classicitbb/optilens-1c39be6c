-- Centralized security audit logging, alerting, and governance controls.

CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('auth', 'privileged_action', 'edge_security', 'incident_response', 'secrets_management')),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  status_code integer,
  actor_user_id uuid,
  actor_role text,
  source_function text,
  source_path text,
  request_id text,
  ip_hint text,
  user_agent text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  redacted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_category_occurred
  ON public.security_audit_events(category, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_event_type_occurred
  ON public.security_audit_events(event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_status_code_occurred
  ON public.security_audit_events(status_code, occurred_at DESC)
  WHERE status_code IN (401, 403, 429);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_ip_hint_occurred
  ON public.security_audit_events(ip_hint, occurred_at DESC)
  WHERE ip_hint IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('auth_anomaly', 'error_spike', 'abuse_pattern', 'service_role_exposure')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'acknowledged', 'resolved')),
  dedupe_key text NOT NULL,
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT security_alerts_dedupe_key_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_state_severity_updated
  ON public.security_alerts(state, severity, updated_at DESC);

CREATE OR REPLACE FUNCTION public.redact_security_payload(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
BEGIN
  IF p_payload IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  IF jsonb_typeof(p_payload) = 'array' THEN
    RETURN (
      SELECT jsonb_agg(public.redact_security_payload(elem))
      FROM jsonb_array_elements(p_payload) elem
    );
  END IF;

  IF jsonb_typeof(p_payload) <> 'object' THEN
    RETURN p_payload;
  END IF;

  FOR v_key, v_val IN SELECT key, value FROM jsonb_each(p_payload)
  LOOP
    IF v_key ~* '(password|secret|token|credential|authorization|api[_-]?key|private[_-]?key|access[_-]?key|service[_-]?role|cookie|session)' THEN
      v_result := v_result || jsonb_build_object(v_key, '[REDACTED]');
    ELSE
      v_result := v_result || jsonb_build_object(v_key, public.redact_security_payload(v_val));
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_security_alert(
  p_alert_type text,
  p_severity text,
  p_dedupe_key text,
  p_title text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO public.security_alerts (
    alert_type,
    severity,
    dedupe_key,
    title,
    details,
    first_seen_at,
    last_seen_at,
    occurrence_count,
    state,
    updated_at
  ) VALUES (
    p_alert_type,
    p_severity,
    p_dedupe_key,
    p_title,
    COALESCE(p_details, '{}'::jsonb),
    now(),
    now(),
    1,
    'open',
    now()
  )
  ON CONFLICT (dedupe_key)
  DO UPDATE SET
    severity = EXCLUDED.severity,
    details = public.security_alerts.details || EXCLUDED.details,
    last_seen_at = now(),
    occurrence_count = public.security_alerts.occurrence_count + 1,
    state = CASE WHEN public.security_alerts.state = 'resolved' THEN 'open' ELSE public.security_alerts.state END,
    updated_at = now()
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_category text,
  p_event_type text,
  p_severity text DEFAULT 'info',
  p_status_code integer DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_source_function text DEFAULT NULL,
  p_source_path text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_ip_hint text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_recent_count integer;
BEGIN
  INSERT INTO public.security_audit_events (
    category,
    event_type,
    severity,
    status_code,
    actor_user_id,
    actor_role,
    source_function,
    source_path,
    request_id,
    ip_hint,
    user_agent,
    payload,
    redacted_payload,
    occurred_at
  ) VALUES (
    p_category,
    p_event_type,
    COALESCE(NULLIF(p_severity, ''), 'info'),
    p_status_code,
    p_actor_user_id,
    p_actor_role,
    p_source_function,
    p_source_path,
    p_request_id,
    p_ip_hint,
    p_user_agent,
    COALESCE(p_payload, '{}'::jsonb),
    public.redact_security_payload(COALESCE(p_payload, '{}'::jsonb)),
    COALESCE(p_occurred_at, now())
  ) RETURNING id INTO v_event_id;

  IF p_category = 'auth' AND p_event_type IN ('auth.unauthorized', 'auth.forbidden') AND p_ip_hint IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_recent_count
    FROM public.security_audit_events
    WHERE category = 'auth'
      AND event_type IN ('auth.unauthorized', 'auth.forbidden')
      AND ip_hint = p_ip_hint
      AND occurred_at >= now() - interval '15 minutes';

    IF v_recent_count >= 10 THEN
      PERFORM public.upsert_security_alert(
        'auth_anomaly',
        CASE WHEN v_recent_count >= 25 THEN 'critical' ELSE 'high' END,
        'auth_anomaly:' || p_ip_hint,
        'Auth anomaly detected from repeated failures',
        jsonb_build_object('ip_hint', p_ip_hint, 'recent_failures_15m', v_recent_count)
      );
    END IF;
  END IF;

  IF p_status_code IN (401, 403, 429) AND p_source_function IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_recent_count
    FROM public.security_audit_events
    WHERE status_code = p_status_code
      AND source_function = p_source_function
      AND occurred_at >= now() - interval '5 minutes';

    IF v_recent_count >= 20 THEN
      PERFORM public.upsert_security_alert(
        'error_spike',
        CASE WHEN p_status_code = 429 OR v_recent_count >= 40 THEN 'critical' ELSE 'high' END,
        'error_spike:' || p_source_function || ':' || p_status_code::text,
        'Repeated HTTP error spike detected',
        jsonb_build_object(
          'source_function', p_source_function,
          'status_code', p_status_code,
          'recent_count_5m', v_recent_count
        )
      );
    END IF;
  END IF;

  IF p_event_type IN ('abuse.rate_limit', 'abuse.bot_detected', 'security.service_role_key_exposed') THEN
    PERFORM public.upsert_security_alert(
      CASE WHEN p_event_type = 'security.service_role_key_exposed' THEN 'service_role_exposure' ELSE 'abuse_pattern' END,
      CASE WHEN p_event_type = 'security.service_role_key_exposed' THEN 'critical' ELSE 'high' END,
      'abuse_pattern:' || COALESCE(p_source_function, 'unknown') || ':' || COALESCE(p_ip_hint, 'none') || ':' || p_event_type,
      'Security abuse pattern detected',
      jsonb_build_object('event_type', p_event_type, 'ip_hint', p_ip_hint, 'source_function', p_source_function)
    );
  END IF;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_incident_runbook_execution(
  p_incident_key text,
  p_runbook_name text,
  p_executed_by uuid,
  p_notes text DEFAULT NULL,
  p_started_at timestamptz DEFAULT now(),
  p_completed_at timestamptz DEFAULT NULL,
  p_status text DEFAULT 'in_progress'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  v_event_id := public.log_security_event(
    p_category => 'incident_response',
    p_event_type => 'incident.runbook_execution',
    p_severity => CASE WHEN p_status = 'failed' THEN 'high' ELSE 'medium' END,
    p_actor_user_id => p_executed_by,
    p_payload => jsonb_build_object(
      'incident_key', p_incident_key,
      'runbook_name', p_runbook_name,
      'status', p_status,
      'notes', p_notes,
      'started_at', p_started_at,
      'completed_at', p_completed_at
    ),
    p_occurred_at => COALESCE(p_completed_at, p_started_at, now())
  );

  RETURN v_event_id;
END;
$$;

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read security_audit_events" ON public.security_audit_events;
CREATE POLICY "Admins can read security_audit_events"
  ON public.security_audit_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can insert security_audit_events" ON public.security_audit_events;
CREATE POLICY "Service role can insert security_audit_events"
  ON public.security_audit_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage security_alerts" ON public.security_alerts;
CREATE POLICY "Admins can manage security_alerts"
  ON public.security_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.security_audit_events IS 'Centralized audit stream for auth, privileged, and edge security events.';
COMMENT ON TABLE public.security_alerts IS 'Security anomaly alerts deduplicated for incident response workflows.';
