-- Fixed-window rate limiting for the public QBO gateway. This function is
-- callable only with the server service key; no browser role can invoke it.
CREATE TABLE IF NOT EXISTS public.qbo_gateway_rate_limits (
  bucket_key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qbo_gateway_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qbo_gateway_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.qbo_consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  current_window timestamptz;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 OR length(p_bucket_key) > 200 THEN
    RAISE EXCEPTION 'invalid rate limit input';
  END IF;

  INSERT INTO public.qbo_gateway_rate_limits (bucket_key, request_count, window_started_at)
  VALUES (p_bucket_key, 1, now())
  ON CONFLICT (bucket_key) DO UPDATE
  SET request_count = CASE
        WHEN qbo_gateway_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          THEN 1
        ELSE qbo_gateway_rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN qbo_gateway_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          THEN now()
        ELSE qbo_gateway_rate_limits.window_started_at
      END,
      updated_at = now()
  RETURNING request_count, window_started_at INTO current_count, current_window;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.qbo_consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
