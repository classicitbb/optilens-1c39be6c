-- Secure the integration_health_metrics_dashboard view (it's a view, not a table, so RLS doesn't apply)
-- Revoke broad access and only allow authenticated users (app-level admin check gates actual usage)
REVOKE ALL ON public.integration_health_metrics_dashboard FROM anon;
REVOKE ALL ON public.integration_health_metrics_dashboard FROM authenticated;
GRANT SELECT ON public.integration_health_metrics_dashboard TO authenticated;