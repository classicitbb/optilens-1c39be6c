-- Drop target-side orphan functions left behind by the retired Odoo/generic
-- integration surface. The referenced integration tables were intentionally
-- removed by 20260624181000_drop_odoo_integration.sql and are absent from
-- Datamation. These SECURITY DEFINER functions were still broadly executable
-- and would fail at runtime against missing tables.

DROP FUNCTION IF EXISTS public.log_integration_event(
  uuid,
  text,
  text,
  text,
  text,
  jsonb
);

DROP FUNCTION IF EXISTS public.timeout_stale_integration_sync_jobs();
