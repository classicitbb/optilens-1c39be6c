
-- 1) Update cancel_integration_sync_job to allow canceling both queued AND running jobs
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

  IF v_job.status NOT IN ('queued', 'running') THEN
    RAISE EXCEPTION 'Only queued or running sync jobs can be canceled.';
  END IF;

  UPDATE public.integration_sync_jobs
  SET
    status = 'failed',
    error_message = CASE
      WHEN v_job.status = 'running' THEN 'Cancelled by admin while running.'
      ELSE 'Cancelled by admin before execution.'
    END,
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
          AND id <> p_sync_job_id
          AND status IN ('queued', 'running')
      ) THEN 'queued'
      ELSE 'idle'
    END,
    updated_at = now()
  WHERE id = v_job.integration_connection_id;

  INSERT INTO public.integration_audit_events (
    integration_connection_id, tenant_key, provider, event_type, actor_user_id, event_payload
  ) VALUES (
    v_job.integration_connection_id, v_job.tenant_key, v_job.provider,
    'manual_sync_canceled', auth.uid(),
    jsonb_build_object('sync_job_id', v_job.id, 'previous_status', v_job.status)
  );

  PERFORM public.log_integration_event(
    v_job.integration_connection_id, v_job.tenant_key, v_job.provider,
    'warn', 'manual_sync_canceled',
    jsonb_build_object('sync_job_id', v_job.id, 'previous_status', v_job.status)
  );
END;
$$;

-- 2) Create a function to timeout sync jobs stuck for >2 hours
CREATE OR REPLACE FUNCTION public.timeout_stale_integration_sync_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH stale AS (
    UPDATE public.integration_sync_jobs
    SET
      status = 'failed',
      error_message = 'Timed out after 2 hours.',
      completed_at = now(),
      updated_at = now()
    WHERE status IN ('queued', 'running')
      AND (
        (status = 'running' AND started_at IS NOT NULL AND started_at < now() - interval '2 hours')
        OR (status = 'queued' AND requested_at < now() - interval '2 hours')
      )
    RETURNING integration_connection_id, tenant_key, provider, id
  )
  SELECT COUNT(*) INTO v_count FROM stale;

  -- Reset retry_state for connections whose jobs were all timed out
  UPDATE public.integration_connections ic
  SET retry_state = 'idle', updated_at = now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.integration_sync_jobs j
    WHERE j.integration_connection_id = ic.id AND j.status IN ('queued', 'running')
  )
  AND ic.retry_state IS DISTINCT FROM 'idle';

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.timeout_stale_integration_sync_jobs() TO authenticated;
