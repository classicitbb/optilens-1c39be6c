-- ============================================================
-- Remove the Odoo integration entirely
-- ------------------------------------------------------------
-- The Odoo connector is decommissioned and replaced by the Scotia eCom+
-- payment-gateway secret store (20260624180000). This drops all Odoo-specific
-- tables, views, and routines. Everything is guarded with IF EXISTS / CASCADE
-- so it is safe to run even if some objects were never created.
-- ============================================================

-- 1. Drop all Odoo / generic-integration routines by name (handles overloads).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'enqueue_due_odoo_sync_jobs',
        'get_integration_connection_secret',
        'upsert_integration_connection',
        'upsert_integration_connection_with_secret',
        'trigger_integration_sync_job',
        'cancel_integration_sync_job',
        'manage_integration_sync_error'
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE;', r.proname, r.args);
  END LOOP;
END $$;

-- 2. Drop the dashboard view (may be a view or materialized view).
DROP VIEW IF EXISTS public.integration_health_metrics_dashboard CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.integration_health_metrics_dashboard CASCADE;

-- 3. Drop tables (CASCADE clears dependent FKs, policies, triggers).
DROP TABLE IF EXISTS public.integration_structured_logs CASCADE;
DROP TABLE IF EXISTS public.integration_sync_errors CASCADE;
DROP TABLE IF EXISTS public.integration_sync_jobs CASCADE;
DROP TABLE IF EXISTS public.integration_connection_secrets CASCADE;
DROP TABLE IF EXISTS public.integration_connections CASCADE;

-- Note: public.integration_secret_encryption_key() and public.redact_pii_jsonb()
-- are generic helpers and are intentionally retained.
