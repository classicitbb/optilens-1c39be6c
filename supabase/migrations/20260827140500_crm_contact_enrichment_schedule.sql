-- Schedules the CRM contact enrichment sweeps.
--
-- Two jobs:
--   crm_enrich_contacts_nightly  02:40 daily, up to 40 contacts
--   crm_enrich_contacts_new      every 15 min, up to 5 brand-new contacts
--
-- The "on create" path is this 15-minute worker rather than a DB trigger.
-- Contacts are inserted from ContactsPage, MyLeadsPage, useLeads,
-- lead-intelligence and innovations-sync; a frontend fire-and-forget would
-- cover two of those five, and a trigger doing net.http_post inside the insert
-- transaction can stall inserts and would fire thousands of times during an
-- Innovations sync. select_contacts_for_enrichment(p_mode := 'oncreate')
-- already selects "created in the last 24h with no attempt yet".
--
-- PREREQUISITES — this migration deliberately no-ops until both exist:
--   SELECT vault.create_secret('<random-secret>', 'crm_enrich_scheduler_secret');
--   SELECT vault.create_secret('https://<project-ref>.supabase.co/functions/v1/crm-enrich-contacts',
--                              'crm_enrich_function_url');
-- Set the same secret value as the CRM_ENRICH_SCHEDULER_SECRET env var on the
-- crm-enrich-contacts function.
--
-- Do the FIRST scheduled run with ?dryRun=1 and review
-- contact_enrichment_findings by hand before letting it write.
--
-- To revert:
--   SELECT cron.unschedule('crm_enrich_contacts_nightly');
--   SELECT cron.unschedule('crm_enrich_contacts_new');

DO $$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron is not installed; skipping CRM enrichment schedule.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net is not installed; skipping CRM enrichment schedule.';
    RETURN;
  END IF;

  -- Always clear first so re-running this migration is idempotent.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'cron' AND table_name = 'job') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('crm_enrich_contacts_nightly', 'crm_enrich_contacts_new');
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'crm_enrich_scheduler_secret';
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'crm_enrich_function_url';
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
    v_url := NULL;
  END;

  IF v_secret IS NULL OR BTRIM(v_secret) = '' OR v_url IS NULL OR BTRIM(v_url) = '' THEN
    RAISE NOTICE 'crm_enrich_scheduler_secret / crm_enrich_function_url are not in vault; enrichment schedule not created.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'crm_enrich_contacts_nightly',
    '40 2 * * *',
    format(
      $job$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-scheduler-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crm_enrich_scheduler_secret')),
        body := jsonb_build_object('limit', 40));$job$,
      v_url || '?source=scheduled'
    )
  );

  PERFORM cron.schedule(
    'crm_enrich_contacts_new',
    '*/15 * * * *',
    format(
      $job$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-scheduler-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crm_enrich_scheduler_secret')),
        body := jsonb_build_object('limit', 5));$job$,
      v_url || '?source=oncreate'
    )
  );

  RAISE NOTICE 'CRM enrichment schedule created.';
END $$;
