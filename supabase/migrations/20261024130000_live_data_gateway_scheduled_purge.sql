-- Run-cost reduction.
--
-- 1. live-data-gateway used to purge live_data_gateway_requests and
--    live_data_gateway_request_log inline on every agent poll (~35/min). The
--    function now only expires stale rows on user-driven calls; the deletes run
--    here, hourly.
-- 2. cron.job_run_details was never pruned (1.3M rows, ~5 GB). Keep 7 days.
--
-- Deleted rows free space inside the table but do not shrink it on disk. After
-- this migration, run once from the SQL editor (takes an exclusive lock briefly):
--   VACUUM FULL cron.job_run_details;
--
-- To revert:  SELECT cron.unschedule('purge-live-data-gateway');
--             SELECT cron.unschedule('prune-cron-job-run-details');
--             DROP FUNCTION public.purge_live_data_gateway();

CREATE OR REPLACE FUNCTION public.purge_live_data_gateway()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.live_data_gateway_requests WHERE purge_after <= now();
  DELETE FROM public.live_data_gateway_request_log WHERE created_at < now() - interval '14 days';
$$;

REVOKE ALL ON FUNCTION public.purge_live_data_gateway() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_live_data_gateway() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed; gateway purge and cron history prune not scheduled.';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-live-data-gateway';
  PERFORM cron.schedule('purge-live-data-gateway', '7 * * * *', $cron$select public.purge_live_data_gateway();$cron$);

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'prune-cron-job-run-details';
  PERFORM cron.schedule(
    'prune-cron-job-run-details',
    '23 3 * * *',
    $cron$delete from cron.job_run_details where end_time < now() - interval '7 days'$cron$
  );

  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
END
$$;

NOTIFY pgrst, 'reload schema';
