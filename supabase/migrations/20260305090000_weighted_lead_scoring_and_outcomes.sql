-- Weighted, explainable lead scoring factors
CREATE TABLE IF NOT EXISTS public.lead_scoring_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor text NOT NULL UNIQUE,
  weight numeric NOT NULL CHECK (weight >= 0 AND weight <= 100),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id)
);

INSERT INTO public.lead_scoring_weights (factor, weight)
VALUES
  ('firmographic_fit', 20),
  ('role_likelihood', 12),
  ('procurement_readiness', 18),
  ('digital_maturity', 14),
  ('engagement_recency', 12),
  ('geography_fit', 12),
  ('catalog_match', 12)
ON CONFLICT (factor) DO NOTHING;

ALTER TABLE public.lead_scoring_weights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_scoring_weights'
      AND policyname = 'Authenticated can read lead scoring weights'
  ) THEN
    CREATE POLICY "Authenticated can read lead scoring weights"
      ON public.lead_scoring_weights
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_scoring_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id uuid NULL REFERENCES public.opportunities(id) ON DELETE SET NULL,
  outcome_stage text NOT NULL,
  model_score integer NULL,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_scoring_outcomes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_scoring_outcomes'
      AND policyname = 'Authenticated can insert lead scoring outcomes'
  ) THEN
    CREATE POLICY "Authenticated can insert lead scoring outcomes"
      ON public.lead_scoring_outcomes
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_scoring_outcomes'
      AND policyname = 'Authenticated can read lead scoring outcomes'
  ) THEN
    CREATE POLICY "Authenticated can read lead scoring outcomes"
      ON public.lead_scoring_outcomes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reweight_lead_scoring_factors()
RETURNS TABLE (
  factor text,
  suggested_weight numeric,
  conversion_count bigint,
  win_rate numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH expanded AS (
    SELECT
      jsonb_object_keys(COALESCE(score_breakdown, '{}'::jsonb)) AS factor,
      CASE WHEN outcome_stage = 'won' THEN 1 ELSE 0 END AS is_win
    FROM public.lead_scoring_outcomes
    WHERE outcome_stage IN ('won', 'lost')
  )
  SELECT
    expanded.factor,
    ROUND((AVG(expanded.is_win)::numeric * 100), 2) AS suggested_weight,
    COUNT(*) AS conversion_count,
    ROUND(AVG(expanded.is_win)::numeric, 4) AS win_rate
  FROM expanded
  GROUP BY expanded.factor
  ORDER BY suggested_weight DESC;
$$;

GRANT EXECUTE ON FUNCTION public.reweight_lead_scoring_factors() TO authenticated;
