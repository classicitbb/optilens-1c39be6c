-- Stale outbox claims.
--
-- An outbox row moves approved -> claimed when a worker (optilens-local or the
-- gatekeeper-orders Edge Function) takes it. If that worker dies, or cannot
-- report back, the row stayed 'claimed' forever and nothing surfaced it.
--
-- This sweep moves any row claimed for more than 15 minutes to 'failed' with a
-- last_error that tells staff to check the destination before releasing again.
-- It deliberately never returns a row to 'approved': the file or the POST may
-- already have reached the lab, and a blind retry could create a duplicate.
-- 'failed' already shows in the Rx workspace Problems tab and is the state
-- staff re-release from.
--
-- To revert:  SELECT cron.unschedule('sweep-stale-order-claims');
--             DROP FUNCTION public.sweep_stale_order_claims(interval);

CREATE OR REPLACE FUNCTION public.sweep_stale_order_claims(p_older_than interval DEFAULT interval '15 minutes')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rx integer;
  v_stock integer;
BEGIN
  UPDATE public.rx_order_submissions
  SET status = 'failed',
      last_error = CASE dispatch_provider
        WHEN 'gatekeeper' THEN 'Gatekeeper send did not finish. Check the Gatekeeper log before releasing again; the lab may already have the order.'
        ELSE 'The office worker claimed this order but never reported back. Check the Innovations Incoming folder (and its .bad files) before releasing again; the file may already have been dropped.'
      END,
      updated_at = now()
  WHERE status = 'claimed'
    AND claimed_at < now() - p_older_than;
  GET DIAGNOSTICS v_rx = ROW_COUNT;

  UPDATE public.stock_order_submissions
  SET status = 'failed',
      last_error = CASE dispatch_provider
        WHEN 'gatekeeper' THEN 'Gatekeeper send did not finish. Check the Gatekeeper log before releasing again; the lab may already have the order.'
        ELSE 'The office worker claimed this order but never reported back. Check the Innovations Incoming folder (and its .bad files) before releasing again; the file may already have been dropped.'
      END,
      updated_at = now()
  WHERE status = 'claimed'
    AND claimed_at < now() - p_older_than;
  GET DIAGNOSTICS v_stock = ROW_COUNT;

  RETURN v_rx + v_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_stale_order_claims(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_stale_order_claims(interval) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed; sweep-stale-order-claims not scheduled.';
    RETURN;
  END IF;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sweep-stale-order-claims';
  PERFORM cron.schedule('sweep-stale-order-claims', '*/5 * * * *', $cron$select public.sweep_stale_order_claims();$cron$);
END
$$;

NOTIFY pgrst, 'reload schema';
