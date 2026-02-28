-- Sync error queue management for integration settings UI

CREATE TABLE IF NOT EXISTS public.integration_sync_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  sync_job_id uuid REFERENCES public.integration_sync_jobs(id) ON DELETE SET NULL,
  tenant_key text NOT NULL,
  provider text NOT NULL CHECK (provider = 'odoo'),
  source_model text NOT NULL DEFAULT 'res.partner',
  source_identifier text NOT NULL,
  local_identifier uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  error_code text,
  error_message text NOT NULL,
  error_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  redacted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'retry_queued', 'resolved', 'ignored')),
  retry_count integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_errors_connection_status
  ON public.integration_sync_errors(integration_connection_id, status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_sync_errors_tenant_provider_status
  ON public.integration_sync_errors(tenant_key, provider, status, last_seen_at DESC);

ALTER TABLE public.integration_sync_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integration_sync_errors"
  ON public.integration_sync_errors FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.manage_integration_sync_error(
  p_error_id uuid,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text := lower(coalesce(p_action, ''));
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage sync errors.';
  END IF;

  IF v_action = 'retry' THEN
    UPDATE public.integration_sync_errors
    SET
      status = 'retry_queued',
      retry_count = retry_count + 1,
      resolved_at = NULL,
      resolved_by = NULL,
      updated_at = now()
    WHERE id = p_error_id;
  ELSIF v_action = 'resolve' THEN
    UPDATE public.integration_sync_errors
    SET
      status = 'resolved',
      resolved_at = now(),
      resolved_by = auth.uid(),
      updated_at = now()
    WHERE id = p_error_id;
  ELSIF v_action = 'ignore' THEN
    UPDATE public.integration_sync_errors
    SET
      status = 'ignored',
      resolved_at = now(),
      resolved_by = auth.uid(),
      updated_at = now()
    WHERE id = p_error_id;
  ELSE
    RAISE EXCEPTION 'Unsupported sync error action: %', p_action;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manage_integration_sync_error(uuid, text) TO authenticated;

CREATE TRIGGER update_integration_sync_errors_updated_at
  BEFORE UPDATE ON public.integration_sync_errors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
