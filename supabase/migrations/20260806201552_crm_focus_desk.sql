-- CRM Focus Desk: accountable task ownership, collaborators, workflow state,
-- and approval-first automation recipes. Existing activities remain the
-- canonical task store.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.activities
SET owner_id = created_by
WHERE owner_id IS NULL AND created_by IS NOT NULL;

UPDATE public.activities
SET status = CASE lower(COALESCE(status, ''))
  WHEN 'completed' THEN 'completed'
  WHEN 'done' THEN 'completed'
  WHEN 'cancelled' THEN 'cancelled'
  WHEN 'canceled' THEN 'cancelled'
  WHEN 'waiting' THEN 'waiting'
  WHEN 'in_progress' THEN 'in_progress'
  WHEN 'planned' THEN 'planned'
  WHEN 'inbox' THEN 'inbox'
  ELSE 'inbox'
END;

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_priority_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_priority_check
  CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_status_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_status_check
  CHECK (status IN ('inbox', 'planned', 'in_progress', 'waiting', 'completed', 'cancelled'));
ALTER TABLE public.activities ALTER COLUMN status SET DEFAULT 'inbox';

CREATE INDEX IF NOT EXISTS activities_owner_status_due_idx
  ON public.activities(owner_id, status, due_at);
CREATE INDEX IF NOT EXISTS activities_priority_due_idx
  ON public.activities(priority, due_at);

CREATE TABLE IF NOT EXISTS public.activity_participants (
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, user_id, role),
  CONSTRAINT activity_participants_role_check CHECK (role IN ('helper', 'follower'))
);

CREATE INDEX IF NOT EXISTS activity_participants_user_idx
  ON public.activity_participants(user_id, role);

CREATE TABLE IF NOT EXISTS public.activity_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  recipe text NOT NULL,
  trigger_state text NOT NULL DEFAULT 'in_progress',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_automations_recipe_check CHECK
    (recipe IN ('draft_customer_email', 'add_participant', 'create_follow_up', 'prepare_activity')),
  CONSTRAINT activity_automations_trigger_state_check CHECK
    (trigger_state IN ('inbox', 'planned', 'in_progress', 'waiting', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.activity_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.activity_automations(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  trigger_state text NOT NULL,
  status text NOT NULL DEFAULT 'approval_needed',
  proposed_action jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  executed_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_automation_runs_status_check CHECK
    (status IN ('approval_needed', 'running', 'completed', 'needs_attention'))
);

CREATE INDEX IF NOT EXISTS activity_automation_runs_activity_idx
  ON public.activity_automation_runs(activity_id, created_at DESC);

ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_automation_runs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_automations TO authenticated;
GRANT SELECT ON public.activity_automation_runs TO authenticated;

CREATE POLICY "Staff can view activity participants" ON public.activity_participants
  FOR SELECT TO authenticated USING (public.has_staff_role((select auth.uid())));
CREATE POLICY "Editors can manage activity participants" ON public.activity_participants
  FOR ALL TO authenticated
  USING (public.has_edit_role((select auth.uid())))
  WITH CHECK (public.has_edit_role((select auth.uid())));

CREATE POLICY "Staff can view activity automations" ON public.activity_automations
  FOR SELECT TO authenticated USING (public.has_staff_role((select auth.uid())));
CREATE POLICY "Editors can manage activity automations" ON public.activity_automations
  FOR ALL TO authenticated
  USING (public.has_edit_role((select auth.uid())))
  WITH CHECK (public.has_edit_role((select auth.uid())));

CREATE POLICY "Staff can view activity automation runs" ON public.activity_automation_runs
  FOR SELECT TO authenticated USING (public.has_staff_role((select auth.uid())));

-- A state change and its immutable review bundle are created in one
-- transaction. SECURITY DEFINER is narrowly required because clients have no
-- direct INSERT/UPDATE grant on automation runs; the function explicitly
-- verifies the caller's staff edit role before touching either table.
CREATE OR REPLACE FUNCTION public.transition_crm_activity(
  p_activity_id uuid,
  p_state text,
  p_due_at timestamptz DEFAULT NULL,
  p_update_due boolean DEFAULT false
)
RETURNS SETOF public.activity_automation_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_automation public.activity_automations%ROWTYPE;
  v_transition_at timestamptz := clock_timestamp();
  v_run_id uuid;
  v_run_ids uuid[] := ARRAY[]::uuid[];
  v_previous_state text;
BEGIN
  IF (select auth.uid()) IS NULL OR NOT public.has_edit_role((select auth.uid())) THEN
    RAISE EXCEPTION 'Staff edit access required';
  END IF;
  IF p_state NOT IN ('inbox', 'planned', 'in_progress', 'waiting', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid activity state';
  END IF;

  SELECT status INTO v_previous_state
  FROM public.activities WHERE id = p_activity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Activity not found'; END IF;

  UPDATE public.activities
  SET status = p_state,
      due_at = CASE WHEN p_update_due THEN p_due_at ELSE due_at END,
      completed_at = CASE WHEN p_state = 'completed' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_activity_id;

  IF v_previous_state IS DISTINCT FROM p_state THEN
    FOR v_automation IN
      SELECT * FROM public.activity_automations
      WHERE activity_id = p_activity_id AND enabled AND trigger_state = p_state
    LOOP
      INSERT INTO public.activity_automation_runs (
        automation_id, activity_id, trigger_state, proposed_action, idempotency_key
      ) VALUES (
        v_automation.id,
        p_activity_id,
        p_state,
        jsonb_build_object('recipe', v_automation.recipe, 'config', v_automation.config),
        v_automation.id::text || ':' || p_state || ':' || v_transition_at::text
      ) RETURNING id INTO v_run_id;
      v_run_ids := array_append(v_run_ids, v_run_id);
    END LOOP;
  END IF;

  RETURN QUERY
    SELECT r.* FROM public.activity_automation_runs r
    WHERE r.id = ANY(v_run_ids)
    ORDER BY r.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_crm_activity(uuid, text, timestamptz, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_crm_activity(uuid, text, timestamptz, boolean) TO authenticated;

-- Mentioning a helper creates an ordinary staff notification. The notification
-- remains team-visible, matching the existing CRM visibility contract.
CREATE OR REPLACE FUNCTION public.notify_activity_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_title text;
BEGIN
  SELECT COALESCE(activity_type, 'CRM task') INTO v_title
  FROM public.activities WHERE id = NEW.activity_id;

  INSERT INTO public.admin_notifications (
    event_type, severity, title, message, href, metadata, related_user_id
  ) VALUES (
    'task_reminder', 'info', 'You were added to a CRM task', v_title,
    '/admin/crm/activities?task=' || NEW.activity_id::text,
    jsonb_build_object('activity_id', NEW.activity_id, 'participant_role', NEW.role),
    NEW.user_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_participant_notification ON public.activity_participants;
CREATE TRIGGER activity_participant_notification
  AFTER INSERT ON public.activity_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_activity_participant();

-- Keep the existing CRM dashboard RPC compatible with the governed task
-- states: cancelled work is not overdue.
CREATE OR REPLACE FUNCTION public.crm_dashboard_kpis(
  p_period text DEFAULT 'mtd', p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  period_start date, period_end date, contacts_count bigint, price_items_count bigint,
  avg_markup numeric, open_opportunities bigint, overdue_activities bigint,
  quote_acceptance_rate numeric, landed_costing_total numeric
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$
DECLARE v_start_date date; v_end_date date;
BEGIN
  IF lower(coalesce(p_period, 'mtd')) = 'qtd' THEN
    v_start_date := date_trunc('quarter', now())::date; v_end_date := now()::date;
  ELSIF lower(coalesce(p_period, 'mtd')) = 'custom' THEN
    v_start_date := coalesce(p_start_date, now()::date); v_end_date := coalesce(p_end_date, now()::date);
  ELSE
    v_start_date := date_trunc('month', now())::date; v_end_date := now()::date;
  END IF;
  IF v_end_date < v_start_date THEN RAISE EXCEPTION 'p_end_date must be >= p_start_date'; END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT v_start_date::timestamptz AS start_ts, (v_end_date::timestamptz + interval '1 day') AS end_ts
  ), quote_window AS (
    SELECT q.id, q.status FROM public.quotes q CROSS JOIN bounds b
    WHERE q.created_at >= b.start_ts AND q.created_at < b.end_ts
  ), line_window AS (
    SELECT ql.qty, ql.unit_cost_landed_bbd, ql.unit_sell_price_bbd
    FROM public.quote_lines ql JOIN public.quotes q ON q.id = ql.quote_id CROSS JOIN bounds b
    WHERE q.created_at >= b.start_ts AND q.created_at < b.end_ts
  )
  SELECT v_start_date, v_end_date,
    (SELECT count(*) FROM public.contacts c CROSS JOIN bounds b WHERE c.created_at >= b.start_ts AND c.created_at < b.end_ts)::bigint,
    (SELECT count(*) FROM public.price_catalog pc CROSS JOIN bounds b WHERE pc.created_at >= b.start_ts AND pc.created_at < b.end_ts)::bigint,
    COALESCE((SELECT round(avg(((lw.unit_sell_price_bbd - lw.unit_cost_landed_bbd) / nullif(lw.unit_cost_landed_bbd, 0)) * 100.0), 2) FROM line_window lw WHERE lw.unit_cost_landed_bbd > 0), 0)::numeric,
    (SELECT count(*) FROM public.opportunities o CROSS JOIN bounds b WHERE o.created_at >= b.start_ts AND o.created_at < b.end_ts AND lower(coalesce(o.stage, '')) NOT IN ('won', 'lost'))::bigint,
    (SELECT count(*) FROM public.activities a WHERE lower(coalesce(a.status, 'inbox')) NOT IN ('completed', 'cancelled') AND a.due_at IS NOT NULL AND a.due_at < now())::bigint,
    COALESCE((SELECT round(count(*) FILTER (WHERE qw.status = 'Accepted')::numeric / nullif(count(*)::numeric, 0), 4) FROM quote_window qw), 0)::numeric,
    COALESCE((SELECT sum(coalesce(lw.qty, 0) * coalesce(lw.unit_cost_landed_bbd, 0)) FROM line_window lw), 0)::numeric;
END;
$$;

NOTIFY pgrst, 'reload schema';
