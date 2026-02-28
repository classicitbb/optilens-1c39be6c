-- CRM dashboard KPI RPC with period filters (MTD/QTD/custom)
CREATE OR REPLACE FUNCTION public.crm_dashboard_kpis(
  p_period text DEFAULT 'mtd',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  period_start date,
  period_end date,
  contacts_count bigint,
  price_items_count bigint,
  avg_markup numeric,
  open_opportunities bigint,
  overdue_activities bigint,
  quote_acceptance_rate numeric,
  landed_costing_total numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
BEGIN
  IF lower(coalesce(p_period, 'mtd')) = 'qtd' THEN
    v_start_date := date_trunc('quarter', now())::date;
    v_end_date := now()::date;
  ELSIF lower(coalesce(p_period, 'mtd')) = 'custom' THEN
    v_start_date := coalesce(p_start_date, now()::date);
    v_end_date := coalesce(p_end_date, now()::date);
  ELSE
    v_start_date := date_trunc('month', now())::date;
    v_end_date := now()::date;
  END IF;

  IF v_end_date < v_start_date THEN
    RAISE EXCEPTION 'p_end_date must be >= p_start_date';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      v_start_date::timestamptz AS start_ts,
      (v_end_date::timestamptz + interval '1 day') AS end_ts
  ),
  quote_window AS (
    SELECT q.id, q.status
    FROM public.quotes q
    CROSS JOIN bounds b
    WHERE q.created_at >= b.start_ts
      AND q.created_at < b.end_ts
  ),
  line_window AS (
    SELECT
      ql.qty,
      ql.unit_cost_landed_bbd,
      ql.unit_sell_price_bbd
    FROM public.quote_lines ql
    JOIN public.quotes q ON q.id = ql.quote_id
    CROSS JOIN bounds b
    WHERE q.created_at >= b.start_ts
      AND q.created_at < b.end_ts
  )
  SELECT
    v_start_date,
    v_end_date,
    (
      SELECT COUNT(*)
      FROM public.contacts c
      CROSS JOIN bounds b
      WHERE c.created_at >= b.start_ts
        AND c.created_at < b.end_ts
    )::bigint AS contacts_count,
    (
      SELECT COUNT(*)
      FROM public.price_catalog pc
      CROSS JOIN bounds b
      WHERE pc.created_at >= b.start_ts
        AND pc.created_at < b.end_ts
    )::bigint AS price_items_count,
    COALESCE(
      (
        SELECT ROUND(AVG(((lw.unit_sell_price_bbd - lw.unit_cost_landed_bbd) / NULLIF(lw.unit_cost_landed_bbd, 0)) * 100.0), 2)
        FROM line_window lw
        WHERE lw.unit_cost_landed_bbd > 0
      ),
      0
    )::numeric AS avg_markup,
    (
      SELECT COUNT(*)
      FROM public.opportunities o
      CROSS JOIN bounds b
      WHERE o.created_at >= b.start_ts
        AND o.created_at < b.end_ts
        AND lower(coalesce(o.stage, '')) NOT IN ('won', 'lost')
    )::bigint AS open_opportunities,
    (
      SELECT COUNT(*)
      FROM public.activities a
      WHERE lower(coalesce(a.status, 'open')) <> 'completed'
        AND a.due_at IS NOT NULL
        AND a.due_at < now()
    )::bigint AS overdue_activities,
    COALESCE(
      (
        SELECT ROUND(
          COUNT(*) FILTER (WHERE qw.status = 'Accepted')::numeric
          / NULLIF(COUNT(*)::numeric, 0),
          4
        )
        FROM quote_window qw
      ),
      0
    )::numeric AS quote_acceptance_rate,
    COALESCE(
      (
        SELECT SUM(coalesce(lw.qty, 0) * coalesce(lw.unit_cost_landed_bbd, 0))
        FROM line_window lw
      ),
      0
    )::numeric AS landed_costing_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_dashboard_kpis(text, date, date) TO authenticated;
