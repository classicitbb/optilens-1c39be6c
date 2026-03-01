-- Runtime orchestration and resiliency primitives for Odoo contact sync.

ALTER TABLE public.integration_connections
  DROP CONSTRAINT IF EXISTS integration_connections_conflict_policy_check;

ALTER TABLE public.integration_connections
  ADD CONSTRAINT integration_connections_conflict_policy_check
  CHECK (conflict_policy IN ('prefer_odoo', 'prefer_optilens', 'newest_write_date', 'manual_review'));

ALTER TABLE public.integration_connections
  ADD COLUMN IF NOT EXISTS sync_batch_size integer NOT NULL DEFAULT 100 CHECK (sync_batch_size BETWEEN 1 AND 500),
  ADD COLUMN IF NOT EXISTS sync_interval_minutes integer NOT NULL DEFAULT 15 CHECK (sync_interval_minutes BETWEEN 1 AND 1440),
  ADD COLUMN IF NOT EXISTS pull_cursor timestamptz,
  ADD COLUMN IF NOT EXISTS push_cursor timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_finished_at timestamptz;

CREATE TABLE IF NOT EXISTS public.contact_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  run_type text NOT NULL CHECK (run_type IN ('pull', 'push', 'webhook')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  pull_records_processed integer NOT NULL DEFAULT 0,
  push_records_processed integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  cursor_advanced boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_sync_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  sync_direction text NOT NULL CHECK (sync_direction IN ('pull', 'push')),
  external_id text,
  local_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'resolved', 'failed_permanent')),
  last_error text,
  error_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_sync_manual_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  external_id text,
  local_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  reason text NOT NULL,
  remote_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  local_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sync_dead_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sync_manual_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contact_sync_runs"
  ON public.contact_sync_runs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage contact_sync_dead_letters"
  ON public.contact_sync_dead_letters FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage contact_sync_manual_review_queue"
  ON public.contact_sync_manual_review_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_contact_sync_dead_letters_retry
  ON public.contact_sync_dead_letters(status, next_retry_at);

CREATE OR REPLACE FUNCTION public.get_integration_connection_secret(
  p_connection_id uuid
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pgp_sym_decrypt(ics.encrypted_secret, public.integration_secret_encryption_key())::text
  FROM public.integration_connection_secrets ics
  WHERE ics.integration_connection_id = p_connection_id;
$$;

REVOKE ALL ON FUNCTION public.get_integration_connection_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_integration_connection_secret(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_due_odoo_sync_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH due AS (
    SELECT id, tenant_key
    FROM public.integration_connections
    WHERE provider = 'odoo'
      AND status = 'connected'
      AND (
        last_sync_started_at IS NULL
        OR now() >= (last_sync_started_at + make_interval(mins => sync_interval_minutes))
      )
  ), inserted AS (
    INSERT INTO public.integration_sync_jobs (
      integration_connection_id,
      tenant_key,
      provider,
      sync_kind,
      requested_by,
      status,
      requested_at
    )
    SELECT
      due.id,
      due.tenant_key,
      'odoo',
      'incremental',
      COALESCE((SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid),
      'queued',
      now()
    FROM due
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.integration_sync_jobs j
      WHERE j.integration_connection_id = due.id
        AND j.status IN ('queued', 'running')
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;

  UPDATE public.integration_connections c
  SET last_sync_started_at = now(), updated_at = now()
  WHERE c.id IN (SELECT id FROM due)
    AND EXISTS (
      SELECT 1
      FROM public.integration_sync_jobs j
      WHERE j.integration_connection_id = c.id
        AND j.status = 'queued'
        AND j.requested_at >= now() - interval '1 minute'
    );

  RETURN v_count;
END;
$$;
