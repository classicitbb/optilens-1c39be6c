-- Call KPI tracking: record the outcome of each logged call and report
-- calls per day + calls reached per employee on the CRM dashboard.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS call_outcome text
  CHECK (call_outcome IN ('reached', 'voicemail', 'no_answer'));

-- completed_at was only stamped by transition_crm_activity(); tasks created or
-- edited straight into "completed" (e.g. a logged call) never got one.
CREATE OR REPLACE FUNCTION public.stamp_activity_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    NEW.completed_at := coalesce(NEW.completed_at, now());
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activities_stamp_completed_at ON public.activities;
CREATE TRIGGER activities_stamp_completed_at
  BEFORE INSERT OR UPDATE OF status, completed_at ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.stamp_activity_completed_at();

-- One row per employee who completed at least one call in the window.
-- Days are Barbados calendar days; calls_per_day divides by Mon–Fri working
-- days elapsed in the window (minimum 1).
CREATE OR REPLACE FUNCTION public.crm_call_kpis(
  p_period text DEFAULT 'mtd',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  period_start date, period_end date, working_days integer,
  owner_id uuid, calls bigint, reached bigint, calls_per_day numeric
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Barbados')::date;
  v_start date; v_end date; v_days integer;
BEGIN
  IF lower(coalesce(p_period, 'mtd')) = 'qtd' THEN
    v_start := date_trunc('quarter', v_today)::date; v_end := v_today;
  ELSIF lower(coalesce(p_period, 'mtd')) = 'custom' THEN
    v_start := coalesce(p_start_date, v_today); v_end := coalesce(p_end_date, v_today);
  ELSE
    v_start := date_trunc('month', v_today)::date; v_end := v_today;
  END IF;
  IF v_end < v_start THEN RAISE EXCEPTION 'p_end_date must be >= p_start_date'; END IF;

  SELECT greatest(count(*), 1)::integer INTO v_days
  FROM generate_series(v_start, v_end, interval '1 day') d
  WHERE extract(isodow FROM d) < 6;

  RETURN QUERY
  SELECT v_start, v_end, v_days,
    coalesce(a.owner_id, a.created_by),
    count(*)::bigint,
    count(*) FILTER (WHERE a.call_outcome = 'reached')::bigint,
    round(count(*)::numeric / v_days, 1)
  FROM public.activities a
  WHERE a.type = 'call'
    AND a.status = 'completed'
    AND (a.completed_at AT TIME ZONE 'America/Barbados')::date BETWEEN v_start AND v_end
  GROUP BY coalesce(a.owner_id, a.created_by)
  ORDER BY count(*) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_call_kpis(text, date, date) TO authenticated;
