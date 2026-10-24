-- Rx capture retention (Phase 4e): originals and extracted text are kept 24 months,
-- then removed by the rx-capture-purge edge function, run daily by pg_cron.
--
-- rx_capture_settings holds the one shared token that proves a call comes from the
-- scheduler. No policies and no grants: only the service role (the function) and
-- the cron job (postgres) can read it.
--
-- To revert:  SELECT cron.unschedule('rx-capture-purge');

CREATE TABLE IF NOT EXISTS public.rx_capture_settings (
  id          boolean PRIMARY KEY DEFAULT true CHECK (id),
  purge_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex')
);
INSERT INTO public.rx_capture_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.rx_capture_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rx_capture_settings FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_cron / pg_net not installed; rx-capture-purge not scheduled.';
    RETURN;
  END IF;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'rx-capture-purge';
  PERFORM cron.schedule('rx-capture-purge', '10 3 * * *', $cron$
    select net.http_post(
      url := 'https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/rx-capture-purge',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdG1laXJ4aGZiaXlheXJyc29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTUzNjMsImV4cCI6MjA4MjY3MTM2M30.bRo7PkzMGFLeqMN47a3h4ctLqMuC9InnNE4CclgokuI',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdG1laXJ4aGZiaXlheXJyc29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTUzNjMsImV4cCI6MjA4MjY3MTM2M30.bRo7PkzMGFLeqMN47a3h4ctLqMuC9InnNE4CclgokuI',
        'x-rx-purge-token', (select purge_token from public.rx_capture_settings where id)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $cron$);
END
$$;
