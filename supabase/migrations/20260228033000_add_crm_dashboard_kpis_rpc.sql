-- CRM dashboard aggregate RPC
-- Provides a single-row KPI payload for period-scoped CRM dashboard cards.

CREATE OR REPLACE FUNCTION public.crm_dashboard_kpis(
  p_end_date date DEFAULT NULL,
  p_period text DEFAULT 'mtd',
  p_start_date date DEFAULT NULL
)
RETURNS TABLE (
  contacts_count bigint,
  price_items_count bigint,
  avg_markup numeric,
  open_opportunities bigint,
  overdue_activities bigint,
  quote_acceptance_rate numeric,
  landed_costing_totals numeric,
  period_start date,
  period_end date
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_today date := now()::date;
  v_start date;
  v_end date;
BEGIN
  v_end := COALESCE(p_end_date, v_today);

  v_start := COALESCE(
    p_start_date,
    CASE lower(COALESCE(p_period, 'mtd'))
      WHEN 'today' THEN v_end
      WHEN 'wtd' THEN (date_trunc('week', v_end::timestamp))::date
      WHEN 'mtd' THEN (date_trunc('month', v_end::timestamp))::date
      WHEN 'qtd' THEN (date_trunc('quarter', v_end::timestamp))::date
      WHEN 'ytd' THEN (date_trunc('year', v_end::timestamp))::date
      WHEN '30d' THEN (v_end - INTERVAL '29 days')::date
      WHEN '90d' THEN (v_end - INTERVAL '89 days')::date
      ELSE (date_trunc('month', v_end::timestamp))::date
    END
  );

  RETURN QUERY
  WITH ranged_quotes AS (
    SELECT q.*
    FROM public.quotes q
    WHERE q.created_at::date BETWEEN v_start AND v_end
  ),
  ranged_shipments AS (
    SELECT s.*
    FROM public.shipments s
    WHERE COALESCE(s.date_received, s.created_at::date) BETWEEN v_start AND v_end
  )
  SELECT
    (SELECT count(*) FROM public.contacts) AS contacts_count,
    (SELECT count(*) FROM public.price_catalog) AS price_items_count,
    COALESCE(
      (SELECT round(avg(ql.gp_percent)::numeric, 2)
       FROM public.quote_lines ql
       JOIN ranged_quotes rq ON rq.id = ql.quote_id),
      (SELECT round(avg(sl.markup_percent)::numeric, 2)
       FROM public.shipment_lines sl
       JOIN ranged_shipments rs ON rs.id = sl.shipment_id),
      0
    ) AS avg_markup,
    (SELECT count(*)
     FROM public.opportunities o
     WHERE COALESCE(lower(o.stage), '') NOT IN ('won', 'lost', 'closed_won', 'closed_lost')) AS open_opportunities,
    (SELECT count(*)
     FROM public.activities a
     WHERE COALESCE(lower(a.status), 'pending') NOT IN ('completed', 'done')
       AND a.due_at IS NOT NULL
       AND a.due_at::date < v_today) AS overdue_activities,
    COALESCE(
      (SELECT round(
         (count(*) FILTER (WHERE lower(COALESCE(rq.status, '')) = 'accepted')::numeric
          / NULLIF(count(*), 0)::numeric) * 100,
         2
       )
       FROM ranged_quotes rq),
      0
    ) AS quote_acceptance_rate,
    COALESCE(
      (SELECT round(sum(COALESCE(rs.invoice_total_foreign, 0) * COALESCE(NULLIF(rs.exchange_rate, 0), 1))::numeric, 2)
       FROM ranged_shipments rs),
      0
    ) AS landed_costing_totals,
    v_start AS period_start,
    v_end AS period_end;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_dashboard_kpis(date, text, date) TO authenticated;
