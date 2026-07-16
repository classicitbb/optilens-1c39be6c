-- Edge function health monitoring release migration
CREATE TABLE IF NOT EXISTS public.edge_function_health_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('deployment', 'scheduled', 'manual')),
  release_sha text,
  is_healthy boolean NOT NULL,
  function_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edge_function_health (
  function_name text PRIMARY KEY,
  is_healthy boolean NOT NULL,
  last_error text,
  checked_at timestamptz NOT NULL,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_healthy_at timestamptz,
  last_failure_at timestamptz,
  last_run_id uuid REFERENCES public.edge_function_health_runs(id) ON DELETE SET NULL
);

GRANT SELECT ON public.edge_function_health_runs TO authenticated;
GRANT ALL ON public.edge_function_health_runs TO service_role;
GRANT SELECT ON public.edge_function_health TO authenticated;
GRANT ALL ON public.edge_function_health TO service_role;

CREATE INDEX IF NOT EXISTS edge_function_health_runs_created_at_idx
  ON public.edge_function_health_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS edge_function_health_checked_at_idx
  ON public.edge_function_health(checked_at DESC);

ALTER TABLE public.edge_function_health_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_function_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read edge function health runs" ON public.edge_function_health_runs;
CREATE POLICY "Staff can read edge function health runs"
  ON public.edge_function_health_runs FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can read edge function health" ON public.edge_function_health;
CREATE POLICY "Staff can read edge function health"
  ON public.edge_function_health FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

ALTER TABLE public.edge_function_health REPLICA IDENTITY FULL;
ALTER TABLE public.edge_function_health_runs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'edge_function_health'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.edge_function_health;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_edge_function_health(
  p_source text,
  p_release_sha text,
  p_checks jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_check jsonb;
  v_name text;
  v_healthy boolean;
  v_error text;
  v_checked_at timestamptz;
  v_previous_healthy boolean;
  v_previous_failures integer;
  v_failure_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'record_edge_function_health requires the service role';
  END IF;

  IF p_source NOT IN ('deployment', 'scheduled', 'manual') THEN
    RAISE EXCEPTION 'unsupported health check source: %', p_source;
  END IF;

  IF jsonb_typeof(p_checks) <> 'array' OR jsonb_array_length(p_checks) = 0 THEN
    RAISE EXCEPTION 'p_checks must be a non-empty array';
  END IF;

  INSERT INTO public.edge_function_health_runs (
    source, release_sha, is_healthy, function_count, failed_count, checks
  ) VALUES (
    p_source, p_release_sha, true, jsonb_array_length(p_checks), 0, p_checks
  ) RETURNING id INTO v_run_id;

  FOR v_check IN SELECT value FROM jsonb_array_elements(p_checks)
  LOOP
    v_name := nullif(trim(v_check->>'name'), '');
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'health check is missing a function name';
    END IF;

    v_healthy := coalesce((v_check->>'healthy')::boolean, false);
    v_error := nullif(trim(v_check->>'error'), '');
    v_checked_at := coalesce(nullif(v_check->>'checkedAt', '')::timestamptz, now());

    SELECT is_healthy, consecutive_failures
      INTO v_previous_healthy, v_previous_failures
      FROM public.edge_function_health
      WHERE function_name = v_name
      FOR UPDATE;

    INSERT INTO public.edge_function_health (
      function_name, is_healthy, last_error, checked_at, consecutive_failures,
      last_healthy_at, last_failure_at, last_run_id
    ) VALUES (
      v_name,
      v_healthy,
      CASE WHEN v_healthy THEN NULL ELSE coalesce(v_error, 'Health probe did not succeed.') END,
      v_checked_at,
      CASE WHEN v_healthy THEN 0 ELSE 1 END,
      CASE WHEN v_healthy THEN v_checked_at ELSE NULL END,
      CASE WHEN v_healthy THEN NULL ELSE v_checked_at END,
      v_run_id
    ) ON CONFLICT (function_name) DO UPDATE SET
      is_healthy = EXCLUDED.is_healthy,
      last_error = EXCLUDED.last_error,
      checked_at = EXCLUDED.checked_at,
      consecutive_failures = CASE
        WHEN EXCLUDED.is_healthy THEN 0
        ELSE public.edge_function_health.consecutive_failures + 1
      END,
      last_healthy_at = CASE
        WHEN EXCLUDED.is_healthy THEN EXCLUDED.checked_at
        ELSE public.edge_function_health.last_healthy_at
      END,
      last_failure_at = CASE
        WHEN EXCLUDED.is_healthy THEN public.edge_function_health.last_failure_at
        ELSE EXCLUDED.checked_at
      END,
      last_run_id = EXCLUDED.last_run_id;

    IF NOT v_healthy THEN
      v_failure_count := v_failure_count + 1;
      IF v_previous_healthy IS DISTINCT FROM false THEN
        INSERT INTO public.admin_notifications (event_type, severity, title, message, href, metadata)
        VALUES (
          'edge_function_unhealthy',
          'error',
          format('Edge function unavailable: %s', v_name),
          coalesce(v_error, 'The latest readiness probe did not succeed.'),
          '/admin/settings/edge-functions',
          jsonb_build_object('function_name', v_name, 'run_id', v_run_id, 'source', p_source)
        );
      END IF;
    ELSIF v_previous_healthy = false THEN
      INSERT INTO public.admin_notifications (event_type, severity, title, message, href, metadata)
      VALUES (
        'edge_function_recovered',
        'info',
        format('Edge function recovered: %s', v_name),
        'The latest readiness probe completed successfully.',
        '/admin/settings/edge-functions',
        jsonb_build_object('function_name', v_name, 'run_id', v_run_id, 'source', p_source)
      );
    END IF;
  END LOOP;

  UPDATE public.edge_function_health_runs
  SET is_healthy = v_failure_count = 0,
      failed_count = v_failure_count
  WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_edge_function_health(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_edge_function_health(text, text, jsonb) TO service_role;