CREATE OR REPLACE FUNCTION public.crm_dashboard_kpis(p_period text DEFAULT 'mtd'::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(period_start date, period_end date, contacts_count bigint, price_items_count bigint, avg_markup numeric, open_opportunities bigint, overdue_activities bigint, quote_acceptance_rate numeric, landed_costing_total numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_start_date date; v_end_date date;
BEGIN
  IF lower(coalesce(p_period, 'mtd')) = 'qtd' THEN
    v_start_date := date_trunc('quarter', now())::date; v_end_date := now()::date;
  ELSIF lower(coalesce(p_period, 'mtd')) = 'custom' THEN
    v_start_date := coalesce(p_start_date, now()::date); v_end_date := coalesce(p_end_date, now()::date);
  ELSE
    v_start_date := date_trunc('month', now())::date; v_end_date := now()::date;
  END IF;
  IF v_end_date < v_start_date THEN RAISE EXCEPTION 'p_end_date must be >= p_start_date'; END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT v_start_date::timestamptz AS start_ts, (v_end_date::timestamptz + interval '1 day') AS end_ts
  ), quote_window AS (
    SELECT q.id, q.status FROM public.quotes q CROSS JOIN bounds b
    WHERE q.created_at >= b.start_ts AND q.created_at < b.end_ts
  ), line_window AS (
    SELECT ql.qty, ql.unit_cost_landed_bbd, ql.unit_sell_price_bbd
    FROM public.quote_lines ql JOIN public.quotes q ON q.id = ql.quote_id CROSS JOIN bounds b
    WHERE q.created_at >= b.start_ts AND q.created_at < b.end_ts
  )
  SELECT v_start_date, v_end_date,
    (SELECT count(*) FROM public.contacts c CROSS JOIN bounds b WHERE c.created_at >= b.start_ts AND c.created_at < b.end_ts)::bigint,
    -- price_catalog has no created_at column, so this is a point-in-time total
    -- rather than a period count.
    (SELECT count(*) FROM public.price_catalog pc)::bigint,
    COALESCE((SELECT round(avg(((lw.unit_sell_price_bbd - lw.unit_cost_landed_bbd) / nullif(lw.unit_cost_landed_bbd, 0)) * 100.0), 2) FROM line_window lw WHERE lw.unit_cost_landed_bbd > 0), 0)::numeric,
    (SELECT count(*) FROM public.opportunities o CROSS JOIN bounds b WHERE o.created_at >= b.start_ts AND o.created_at < b.end_ts AND lower(coalesce(o.stage, '')) NOT IN ('won', 'lost'))::bigint,
    (SELECT count(*) FROM public.activities a WHERE lower(coalesce(a.status, 'inbox')) NOT IN ('completed', 'cancelled') AND a.due_at IS NOT NULL AND a.due_at < now())::bigint,
    COALESCE((SELECT round(count(*) FILTER (WHERE qw.status = 'Accepted')::numeric / nullif(count(*)::numeric, 0), 4) FROM quote_window qw), 0)::numeric,
    COALESCE((SELECT sum(coalesce(lw.qty, 0) * coalesce(lw.unit_cost_landed_bbd, 0)) FROM line_window lw), 0)::numeric;
END;
$function$;