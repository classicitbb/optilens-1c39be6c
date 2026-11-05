-- CRM lifecycle: stage history, funnel read model, marketing opt-out, and the
-- columns the server-side cadence runner needs.
-- Additive only. Nothing here sends mail; the runner is a separate function and
-- its schedule (end of file) is a no-op until vault secrets exist.

-- 1. Stage history ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  pipeline text NULL,
  from_stage text NULL,
  to_stage text NULL,
  actor_user_id uuid NULL,
  source text NOT NULL DEFAULT 'db',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_stage_events_contact_idx
  ON public.contact_stage_events (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_stage_events_to_stage_idx
  ON public.contact_stage_events (to_stage, created_at DESC);

ALTER TABLE public.contact_stage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Role users can select contact stage events" ON public.contact_stage_events;
CREATE POLICY "Role users can select contact stage events"
  ON public.contact_stage_events FOR SELECT USING (has_any_role(auth.uid()));
-- No INSERT/UPDATE/DELETE policy: only the trigger below (SECURITY DEFINER) writes.

CREATE OR REPLACE FUNCTION public.log_contact_stage_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stage IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.contact_stage_events (contact_id, pipeline, from_stage, to_stage, actor_user_id, source)
    VALUES (NEW.id, NEW.pipeline, NULL, NEW.stage, auth.uid(), 'insert');
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage OR NEW.pipeline IS DISTINCT FROM OLD.pipeline THEN
    INSERT INTO public.contact_stage_events (contact_id, pipeline, from_stage, to_stage, actor_user_id, source)
    VALUES (NEW.id, NEW.pipeline, OLD.stage, NEW.stage, auth.uid(), 'update');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_log_stage_event ON public.contacts;
CREATE TRIGGER contacts_log_stage_event
  AFTER INSERT OR UPDATE OF stage, pipeline ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_contact_stage_event();

-- Baseline: current position only. Earlier history was never recorded and is
-- not invented here.
INSERT INTO public.contact_stage_events (contact_id, pipeline, from_stage, to_stage, source, created_at)
SELECT c.id, c.pipeline, NULL, c.stage, 'baseline', COALESCE(c.stage_entered_at, now())
FROM public.contacts c
WHERE c.stage IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.contact_stage_events e WHERE e.contact_id = c.id);

-- 2. Funnel read model --------------------------------------------------------
CREATE OR REPLACE VIEW public.crm_funnel_summary AS
SELECT
  c.pipeline,
  c.stage,
  count(*) AS contacts,
  round(avg(EXTRACT(EPOCH FROM (now() - COALESCE(c.stage_entered_at, c.created_at))) / 86400)::numeric, 1) AS avg_days_in_stage,
  (
    SELECT count(*) FROM public.contact_stage_events e
    WHERE e.pipeline = c.pipeline AND e.to_stage = c.stage
      AND e.source <> 'baseline' AND e.created_at >= now() - interval '30 days'
  ) AS entered_last_30_days
FROM public.contacts c
WHERE c.pipeline IS NOT NULL AND c.stage IS NOT NULL AND COALESCE(c.is_archived, false) = false
GROUP BY c.pipeline, c.stage;

ALTER VIEW public.crm_funnel_summary SET (security_invoker = on);
GRANT SELECT ON public.crm_funnel_summary TO authenticated;

-- 3. Marketing opt-out --------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS marketing_opt_out_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS marketing_opt_out_source text NULL;

-- 4. Runner bookkeeping -------------------------------------------------------
ALTER TABLE public.cadence_enrollments
  ADD COLUMN IF NOT EXISTS last_error text NULL,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz NULL;

-- auto_send is set only when a person approves a draft with "Approve & send":
-- the content is human-approved, the timing is the runner's.
ALTER TABLE public.outreach_outbox
  ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS send_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS outreach_outbox_auto_send_idx
  ON public.outreach_outbox (created_at) WHERE status = 'approved' AND auto_send = true AND sent_at IS NULL;

-- 5. Schedule (every 15 minutes) ----------------------------------------------
-- PREREQUISITES — no-ops until both vault secrets exist:
--   SELECT vault.create_secret('<random-secret>', 'crm_cadence_scheduler_secret');
--   SELECT vault.create_secret('https://<project-ref>.supabase.co/functions/v1/crm-cadence-runner',
--                              'crm_cadence_function_url');
-- Set the same secret as CRM_CADENCE_SCHEDULER_SECRET on crm-cadence-runner and
-- crm-draft-outreach, plus CRM_UNSUBSCRIBE_SECRET on crm-cadence-runner and
-- crm-unsubscribe. Revert: SELECT cron.unschedule('crm_cadence_runner');
DO $$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_cron/pg_net not installed; cadence runner schedule skipped.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'cron' AND table_name = 'job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'crm_cadence_runner';
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'crm_cadence_scheduler_secret';
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'crm_cadence_function_url';
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
    v_url := NULL;
  END;

  IF v_secret IS NULL OR BTRIM(v_secret) = '' OR v_url IS NULL OR BTRIM(v_url) = '' THEN
    RAISE NOTICE 'crm_cadence_* vault secrets missing; cadence runner schedule not created.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'crm_cadence_runner',
    '*/15 * * * *',
    format(
      $job$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-scheduler-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crm_cadence_scheduler_secret')),
        body := '{}'::jsonb);$job$,
      v_url
    )
  );
  RAISE NOTICE 'CRM cadence runner schedule created.';
END $$;
