ALTER TABLE public.lead_search_strategies
  ADD COLUMN IF NOT EXISTS base_weight numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS performance_weight numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cac_penalty_weight numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS negative_filters text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS last_performance_refresh_at timestamptz;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS source_search_run_id uuid REFERENCES public.lead_search_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS opportunities_source_search_run_id_idx ON public.opportunities(source_search_run_id);

CREATE TABLE IF NOT EXISTS public.lead_search_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL UNIQUE REFERENCES public.opportunities(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_search_run_id uuid REFERENCES public.lead_search_runs(id) ON DELETE SET NULL,
  lifecycle_stage text NOT NULL CHECK (lifecycle_stage IN ('contacted', 'meeting', 'proposal', 'won', 'lost')),
  is_won boolean,
  deal_size numeric,
  source text NOT NULL DEFAULT 'crm_pipeline',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_search_outcomes_run_idx ON public.lead_search_outcomes(lead_search_run_id);
CREATE INDEX IF NOT EXISTS lead_search_outcomes_stage_idx ON public.lead_search_outcomes(lifecycle_stage);
CREATE INDEX IF NOT EXISTS lead_search_outcomes_recorded_at_idx ON public.lead_search_outcomes(recorded_at DESC);

ALTER TABLE public.lead_search_outcomes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_search_outcomes' AND policyname = 'lead_search_outcomes_select_auth'
  ) THEN
    CREATE POLICY lead_search_outcomes_select_auth
      ON public.lead_search_outcomes FOR SELECT
      TO authenticated
      USING (has_any_role(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_search_outcomes' AND policyname = 'lead_search_outcomes_write_editors'
  ) THEN
    CREATE POLICY lead_search_outcomes_write_editors
      ON public.lead_search_outcomes FOR ALL
      TO authenticated
      USING (has_edit_role(auth.uid()))
      WITH CHECK (has_edit_role(auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_strategy_segment_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.lead_search_strategies(id) ON DELETE CASCADE,
  segment_key text NOT NULL,
  source_key text NOT NULL,
  query_fingerprint text NOT NULL,
  sample_size integer NOT NULL DEFAULT 0,
  contacted_count integer NOT NULL DEFAULT 0,
  meeting_count integer NOT NULL DEFAULT 0,
  proposal_count integer NOT NULL DEFAULT 0,
  won_count integer NOT NULL DEFAULT 0,
  lost_count integer NOT NULL DEFAULT 0,
  win_rate numeric NOT NULL DEFAULT 0,
  avg_deal_size numeric,
  cac_proxy numeric,
  performance_score numeric NOT NULL DEFAULT 0,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  period_start date NOT NULL,
  period_end date NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (strategy_id, segment_key, source_key, query_fingerprint, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS lead_strategy_segment_performance_strategy_idx
  ON public.lead_strategy_segment_performance(strategy_id, period_end DESC, computed_at DESC);

ALTER TABLE public.lead_strategy_segment_performance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_strategy_segment_performance' AND policyname = 'lead_strategy_segment_performance_select_auth'
  ) THEN
    CREATE POLICY lead_strategy_segment_performance_select_auth
      ON public.lead_strategy_segment_performance FOR SELECT
      TO authenticated
      USING (has_any_role(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_strategy_segment_performance' AND policyname = 'lead_strategy_segment_performance_write_editors'
  ) THEN
    CREATE POLICY lead_strategy_segment_performance_write_editors
      ON public.lead_strategy_segment_performance FOR ALL
      TO authenticated
      USING (has_edit_role(auth.uid()))
      WITH CHECK (has_edit_role(auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_lead_strategy_segment_performance(lookback_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start_date date := (now() - make_interval(days => GREATEST(lookback_days, 1)))::date;
  period_end_date date := now()::date;
  rows_written integer := 0;
BEGIN
  DELETE FROM public.lead_strategy_segment_performance
  WHERE period_start = period_start_date
    AND period_end = period_end_date;

  WITH run_sources AS (
    SELECT
      r.id AS run_id,
      r.selected_intent,
      r.query_input,
      r.providers_used,
      COALESCE((r.selected_intent ->> 'strategyId')::uuid, NULL) AS strategy_id,
      COALESCE(NULLIF(lower(trim(r.selected_intent ->> 'industry')), ''), 'unknown') AS segment_key,
      COALESCE(NULLIF(lower(trim(COALESCE(r.query_input, r.selected_intent ->> 'query'))), ''), 'unknown') AS query_fingerprint,
      COALESCE(NULLIF(lower(trim(src.provider)), ''), 'unknown') AS source_key
    FROM public.lead_search_runs r
    LEFT JOIN LATERAL unnest(CASE WHEN array_length(r.providers_used, 1) IS NULL THEN ARRAY['unknown']::text[] ELSE r.providers_used END) AS src(provider) ON TRUE
    WHERE r.created_at >= (period_start_date::timestamptz)
  ), joined AS (
    SELECT
      rs.strategy_id,
      rs.segment_key,
      rs.source_key,
      regexp_replace(rs.query_fingerprint, '\s+', ' ', 'g') AS query_fingerprint,
      o.lifecycle_stage,
      o.is_won,
      o.deal_size
    FROM run_sources rs
    LEFT JOIN public.lead_search_outcomes o ON o.lead_search_run_id = rs.run_id
    WHERE rs.strategy_id IS NOT NULL
  ), agg AS (
    SELECT
      strategy_id,
      segment_key,
      source_key,
      query_fingerprint,
      COUNT(*)::integer AS sample_size,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'contacted')::integer AS contacted_count,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'meeting')::integer AS meeting_count,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'proposal')::integer AS proposal_count,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'won')::integer AS won_count,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'lost')::integer AS lost_count,
      COALESCE(AVG(deal_size) FILTER (WHERE lifecycle_stage = 'won' AND deal_size IS NOT NULL), 0)::numeric AS avg_deal_size,
      COALESCE(
        (COUNT(*) FILTER (WHERE lifecycle_stage = 'won'))::numeric / NULLIF((COUNT(*) FILTER (WHERE lifecycle_stage IN ('won', 'lost')))::numeric, 0),
        0
      )::numeric AS win_rate
    FROM joined
    GROUP BY strategy_id, segment_key, source_key, query_fingerprint
  )
  INSERT INTO public.lead_strategy_segment_performance (
    strategy_id,
    segment_key,
    source_key,
    query_fingerprint,
    sample_size,
    contacted_count,
    meeting_count,
    proposal_count,
    won_count,
    lost_count,
    win_rate,
    avg_deal_size,
    cac_proxy,
    performance_score,
    factors,
    period_start,
    period_end,
    computed_at
  )
  SELECT
    a.strategy_id,
    a.segment_key,
    a.source_key,
    a.query_fingerprint,
    a.sample_size,
    a.contacted_count,
    a.meeting_count,
    a.proposal_count,
    a.won_count,
    a.lost_count,
    a.win_rate,
    a.avg_deal_size,
    CASE WHEN a.won_count = 0 THEN a.sample_size::numeric ELSE (a.sample_size::numeric / a.won_count::numeric) END AS cac_proxy,
    (a.win_rate * 100) - (CASE WHEN a.won_count = 0 THEN a.sample_size::numeric ELSE (a.sample_size::numeric / a.won_count::numeric) END) AS performance_score,
    jsonb_build_object(
      'win_rate', a.win_rate,
      'cac_proxy', CASE WHEN a.won_count = 0 THEN a.sample_size::numeric ELSE (a.sample_size::numeric / a.won_count::numeric) END,
      'avg_deal_size', a.avg_deal_size,
      'sample_size', a.sample_size
    ),
    period_start_date,
    period_end_date,
    now()
  FROM agg a;

  GET DIAGNOSTICS rows_written = ROW_COUNT;
  RETURN rows_written;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_lead_strategy_learning(lookback_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated integer := 0;
BEGIN
  PERFORM public.refresh_lead_strategy_segment_performance(lookback_days);

  WITH strategy_rollup AS (
    SELECT
      p.strategy_id,
      COALESCE(SUM(p.won_count)::numeric / NULLIF(SUM(p.won_count + p.lost_count)::numeric, 0), 0) AS win_rate,
      COALESCE(AVG(p.cac_proxy), 0) AS avg_cac_proxy,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.query_fingerprint) FILTER (WHERE p.win_rate <= 0.05 AND p.sample_size >= 3), NULL) AS low_performing_queries
    FROM public.lead_strategy_segment_performance p
    WHERE p.period_end >= (now() - make_interval(days => GREATEST(lookback_days, 1)))::date
    GROUP BY p.strategy_id
  )
  UPDATE public.lead_search_strategies s
  SET
    performance_weight = GREATEST(0.5, LEAST(2.5, 0.7 + (r.win_rate * 2))),
    cac_penalty_weight = GREATEST(0.5, LEAST(3, 0.8 + (r.avg_cac_proxy / 5))),
    negative_filters = COALESCE(r.low_performing_queries, '{}'::text[]),
    last_performance_refresh_at = now(),
    updated_at = now()
  FROM strategy_rollup r
  WHERE s.id = r.strategy_id;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'cron' AND table_name = 'job') THEN
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'lead_strategy_learning_daily';
    END IF;

    PERFORM cron.schedule(
      'lead_strategy_learning_daily',
      '15 2 * * *',
      $$SELECT public.apply_lead_strategy_learning(90);$$
    );
  END IF;
END $$;
