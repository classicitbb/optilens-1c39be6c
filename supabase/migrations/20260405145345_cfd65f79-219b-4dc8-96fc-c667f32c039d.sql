-- Fix 1: Replace overly permissive store_product_media write policy
DROP POLICY IF EXISTS "store_product_media_write_authenticated" ON public.store_product_media;

CREATE POLICY "store_product_media_write_staff"
  ON public.store_product_media
  FOR ALL
  TO authenticated
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

-- Fix 2: Recreate integration_health_metrics_dashboard view with security_invoker
CREATE OR REPLACE VIEW public.integration_health_metrics_dashboard
  WITH (security_invoker = true)
  AS
  SELECT c.id AS integration_connection_id,
     c.tenant_key,
     c.provider,
     max(
         CASE
             WHEN m.success THEN m.run_completed_at
             ELSE NULL::timestamp with time zone
         END) AS last_successful_run_at,
     COALESCE(max(m.source_lag_seconds), 0) AS lag_behind_source_seconds,
     COALESCE(round(avg(m.error_rate), 4), (0)::numeric) AS error_rate,
     COALESCE(round(avg(m.records_processed), 2), (0)::numeric) AS records_processed_per_run
    FROM (integration_connections c
      LEFT JOIN integration_sync_run_metrics m ON ((m.integration_connection_id = c.id)))
   GROUP BY c.id, c.tenant_key, c.provider;