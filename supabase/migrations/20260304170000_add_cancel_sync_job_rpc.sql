-- Allow admins to cancel queued integration sync jobs from Settings > Integrations.

CREATE OR REPLACE FUNCTION public.cancel_integration_sync_job(
  p_sync_job_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can cancel integration sync jobs.';
  END IF;

  SELECT * INTO v_job
  FROM public.integration_sync_jobs
  WHERE id = p_sync_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Sync job not found.';
  END IF;

  IF v_job.status <> 'queued' THEN
    RAISE EXCEPTION 'Only queued sync jobs can be canceled.';
  END IF;

  UPDATE public.integration_sync_jobs
  SET
    status = 'failed',
    error_message = 'Cancelled by admin before execution.',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_sync_job_id;

  UPDATE public.integration_connections
  SET
    retry_state = CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.integration_sync_jobs
        WHERE integration_connection_id = v_job.integration_connection_id
          AND status IN ('queued', 'running')
      ) THEN 'queued'
      ELSE 'idle'
    END,
    updated_at = now()
  WHERE id = v_job.integration_connection_id;

  INSERT INTO public.integration_audit_events (
    integration_connection_id,
    tenant_key,
    provider,
    event_type,
    actor_user_id,
    event_payload
  )
  VALUES (
    v_job.integration_connection_id,
    v_job.tenant_key,
    v_job.provider,
    'manual_sync_canceled',
    auth.uid(),
    jsonb_build_object('sync_job_id', v_job.id)
  );

  PERFORM public.log_integration_event(
    v_job.integration_connection_id,
    v_job.tenant_key,
    v_job.provider,
    'warn',
    'manual_sync_canceled',
    jsonb_build_object('sync_job_id', v_job.id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_integration_sync_job(uuid) TO authenticated;
