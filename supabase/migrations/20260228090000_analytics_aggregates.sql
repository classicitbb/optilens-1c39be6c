-- Analytics aggregates for executive KPI cards, CRM funnel, and quote/costing performance.

-- Performance indexes for aggregate filters/grouping.
CREATE INDEX IF NOT EXISTS opportunities_created_at_idx
  ON public.opportunities (created_at);
CREATE INDEX IF NOT EXISTS opportunities_stage_created_at_idx
  ON public.opportunities (stage, created_at);

CREATE INDEX IF NOT EXISTS quotes_created_at_idx
  ON public.quotes (created_at);
CREATE INDEX IF NOT EXISTS quotes_status_created_at_idx
  ON public.quotes (status, created_at);

CREATE INDEX IF NOT EXISTS quote_lines_quote_id_idx
  ON public.quote_lines (quote_id);

CREATE INDEX IF NOT EXISTS contacts_created_at_idx
  ON public.contacts (created_at);
CREATE INDEX IF NOT EXISTS contacts_status_created_at_idx
  ON public.contacts (status, created_at);

-- Ensure authenticated users can read source tables that power analytics views.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contacts'
      AND policyname = 'contacts_select_authenticated_analytics'
  ) THEN
    CREATE POLICY contacts_select_authenticated_analytics
      ON public.contacts
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'opportunities'
      AND policyname = 'opportunities_select_authenticated_analytics'
  ) THEN
    CREATE POLICY opportunities_select_authenticated_analytics
      ON public.opportunities
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_select_authenticated_analytics'
  ) THEN
    CREATE POLICY quotes_select_authenticated_analytics
      ON public.quotes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quote_lines'
      AND policyname = 'quote_lines_select_authenticated_analytics'
  ) THEN
    CREATE POLICY quote_lines_select_authenticated_analytics
      ON public.quote_lines
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- 1) Daily KPI aggregate for executive cards.
CREATE OR REPLACE VIEW public.analytics_daily_kpi
WITH (security_invoker = on)
AS
WITH quote_costs AS (
  SELECT
    q.id AS quote_id,
    COALESCE(SUM(ql.qty * ql.unit_sell_price_bbd), 0)::numeric AS quoted_sell_total,
    COALESCE(SUM(ql.qty * ql.unit_cost_landed_bbd), 0)::numeric AS quoted_cost_total
  FROM public.quotes q
  LEFT JOIN public.quote_lines ql ON ql.quote_id = q.id
  GROUP BY q.id
)
SELECT
  date_trunc('day', q.created_at)::date AS kpi_date,
  COUNT(*)::bigint AS quotes_created,
  COUNT(*) FILTER (WHERE q.status = 'Accepted')::bigint AS quotes_accepted,
  ROUND(
    COALESCE(
      COUNT(*) FILTER (WHERE q.status = 'Accepted')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
      0
    ),
    4
  ) AS quote_acceptance_rate,
  COALESCE(SUM(q.grand_total), 0)::numeric AS quoted_revenue,
  COALESCE(SUM(CASE WHEN q.status = 'Accepted' THEN q.grand_total ELSE 0 END), 0)::numeric AS accepted_revenue,
  COALESCE(SUM(qc.quoted_cost_total), 0)::numeric AS quoted_cost,
  COALESCE(SUM(qc.quoted_sell_total - qc.quoted_cost_total), 0)::numeric AS quoted_margin_amount,
  ROUND(
    COALESCE(
      SUM(qc.quoted_sell_total - qc.quoted_cost_total)
      / NULLIF(SUM(qc.quoted_sell_total), 0),
      0
    ),
    4
  ) AS quoted_margin_rate
FROM public.quotes q
LEFT JOIN quote_costs qc ON qc.quote_id = q.id
GROUP BY 1;

GRANT SELECT ON public.analytics_daily_kpi TO authenticated;

-- 2) CRM funnel aggregate by stage and period (day/week/month).
CREATE OR REPLACE VIEW public.analytics_crm_funnel_by_stage_period
WITH (security_invoker = on)
AS
WITH periodized AS (
  SELECT
    'day'::text AS period_granularity,
    date_trunc('day', o.created_at)::date AS period_start,
    o.stage,
    o.estimated_value,
    o.close_probability
  FROM public.opportunities o

  UNION ALL

  SELECT
    'week'::text AS period_granularity,
    date_trunc('week', o.created_at)::date AS period_start,
    o.stage,
    o.estimated_value,
    o.close_probability
  FROM public.opportunities o

  UNION ALL

  SELECT
    'month'::text AS period_granularity,
    date_trunc('month', o.created_at)::date AS period_start,
    o.stage,
    o.estimated_value,
    o.close_probability
  FROM public.opportunities o
)
SELECT
  period_granularity,
  period_start,
  stage,
  COUNT(*)::bigint AS opportunity_count,
  COALESCE(SUM(estimated_value), 0)::numeric AS pipeline_value,
  COALESCE(SUM(estimated_value * COALESCE(close_probability, 0) / 100.0), 0)::numeric AS weighted_pipeline_value,
  ROUND(AVG(COALESCE(close_probability, 0)), 2)::numeric AS avg_close_probability
FROM periodized
GROUP BY 1, 2, 3;

GRANT SELECT ON public.analytics_crm_funnel_by_stage_period TO authenticated;

-- 3) Quote and costing aggregate with margin and acceptance measures.
CREATE OR REPLACE VIEW public.analytics_quote_costing_period
WITH (security_invoker = on)
AS
WITH quote_line_totals AS (
  SELECT
    q.id AS quote_id,
    date_trunc('day', q.created_at)::date AS period_start,
    q.status,
    COALESCE(SUM(ql.qty * ql.unit_sell_price_bbd), 0)::numeric AS line_sell_total,
    COALESCE(SUM(ql.qty * ql.unit_cost_landed_bbd), 0)::numeric AS line_cost_total
  FROM public.quotes q
  LEFT JOIN public.quote_lines ql ON ql.quote_id = q.id
  GROUP BY q.id, date_trunc('day', q.created_at)::date, q.status
)
SELECT
  period_start,
  status,
  COUNT(*)::bigint AS quote_count,
  COALESCE(SUM(line_sell_total), 0)::numeric AS sell_total,
  COALESCE(SUM(line_cost_total), 0)::numeric AS cost_total,
  COALESCE(SUM(line_sell_total - line_cost_total), 0)::numeric AS margin_total,
  ROUND(
    COALESCE(
      SUM(line_sell_total - line_cost_total)
      / NULLIF(SUM(line_sell_total), 0),
      0
    ),
    4
  ) AS margin_rate,
  COUNT(*) FILTER (WHERE status = 'Accepted')::bigint AS accepted_quotes,
  ROUND(
    COALESCE(
      COUNT(*) FILTER (WHERE status = 'Accepted')::numeric
      / NULLIF(COUNT(*)::numeric, 0),
      0
    ),
    4
  ) AS acceptance_rate
FROM quote_line_totals
GROUP BY 1, 2;

GRANT SELECT ON public.analytics_quote_costing_period TO authenticated;
