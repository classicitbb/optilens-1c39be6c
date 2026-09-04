CREATE OR REPLACE FUNCTION public.upsert_website_analytics_session(p_session jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := (p_session->>'id')::uuid;
  v_write_token text := p_session->>'write_token';
BEGIN
  IF v_id IS NULL OR v_write_token IS NULL OR length(v_write_token) < 32 THEN
    RAISE EXCEPTION 'Invalid analytics session token.';
  END IF;

  UPDATE public.website_analytics_sessions
  SET
    visitor_id = p_session->>'visitor_id',
    started_at = COALESCE((p_session->>'started_at')::timestamptz, started_at),
    last_seen_at = COALESCE((p_session->>'last_seen_at')::timestamptz, last_seen_at),
    landing_path = COALESCE(NULLIF(p_session->>'landing_path', ''), landing_path),
    pageview_count = GREATEST(COALESCE((p_session->>'pageview_count')::integer, pageview_count), 0),
    duration_seconds = GREATEST(COALESCE((p_session->>'duration_seconds')::integer, duration_seconds), 0),
    engaged = COALESCE((p_session->>'engaged')::boolean, engaged),
    is_returning_visitor = COALESCE((p_session->>'is_returning_visitor')::boolean, is_returning_visitor),
    device_type = COALESCE(NULLIF(p_session->>'device_type', ''), device_type),
    referrer_host = COALESCE(NULLIF(p_session->>'referrer_host', ''), referrer_host),
    user_agent = p_session->>'user_agent',
    updated_at = now()
  WHERE id = v_id
    AND write_token = v_write_token;

  IF FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.website_analytics_sessions WHERE id = v_id) THEN
    RAISE EXCEPTION 'Invalid analytics session token.';
  END IF;

  INSERT INTO public.website_analytics_sessions (
    id, write_token, visitor_id, started_at, last_seen_at, landing_path,
    pageview_count, duration_seconds, engaged, is_returning_visitor,
    device_type, referrer_host, user_agent, updated_at
  )
  VALUES (
    v_id,
    v_write_token,
    p_session->>'visitor_id',
    COALESCE((p_session->>'started_at')::timestamptz, now()),
    COALESCE((p_session->>'last_seen_at')::timestamptz, now()),
    COALESCE(NULLIF(p_session->>'landing_path', ''), '/'),
    GREATEST(COALESCE((p_session->>'pageview_count')::integer, 1), 0),
    GREATEST(COALESCE((p_session->>'duration_seconds')::integer, 0), 0),
    COALESCE((p_session->>'engaged')::boolean, false),
    COALESCE((p_session->>'is_returning_visitor')::boolean, false),
    COALESCE(NULLIF(p_session->>'device_type', ''), 'desktop'),
    COALESCE(NULLIF(p_session->>'referrer_host', ''), 'Direct'),
    p_session->>'user_agent',
    now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_website_analytics_session(jsonb) TO anon, authenticated;