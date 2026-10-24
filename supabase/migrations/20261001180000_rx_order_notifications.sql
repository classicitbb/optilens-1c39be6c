-- Rx order notifications (Phase 3): staff are emailed when an order fails to reach
-- the lab or the lab holds one for a day. Customer emails ("released", "shipped")
-- are sent on demand by staff and need no schedule.
--
-- rx_capture_settings (created in 20261001161000) gains the scheduler's token.
-- To revert:  SELECT cron.unschedule('rx-order-staff-alerts');

ALTER TABLE public.rx_capture_settings
  ADD COLUMN IF NOT EXISTS notify_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_cron / pg_net not installed; rx-order-staff-alerts not scheduled.';
    RETURN;
  END IF;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'rx-order-staff-alerts';
  PERFORM cron.schedule('rx-order-staff-alerts', '*/30 * * * *', $cron$
    select net.http_post(
      url := 'https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/rx-order-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdG1laXJ4aGZiaXlheXJyc29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTUzNjMsImV4cCI6MjA4MjY3MTM2M30.bRo7PkzMGFLeqMN47a3h4ctLqMuC9InnNE4CclgokuI',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdG1laXJ4aGZiaXlheXJyc29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTUzNjMsImV4cCI6MjA4MjY3MTM2M30.bRo7PkzMGFLeqMN47a3h4ctLqMuC9InnNE4CclgokuI',
        'x-rx-notify-token', (select notify_token from public.rx_capture_settings where id)
      ),
      body := '{"action":"staff-alerts"}'::jsonb
    ) as request_id;
  $cron$);
END
$$;
