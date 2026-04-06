-- Helpdesk: message threading, watchers, follow-up queue, SLA pause, and contact tokens

-- ─── 1. New columns on helpdesk_tickets ────────────────────────────────────────

ALTER TABLE public.helpdesk_tickets
  ADD COLUMN IF NOT EXISTS contact_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_paused_duration_seconds integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS helpdesk_tickets_contact_token_idx
  ON public.helpdesk_tickets(contact_token);

CREATE INDEX IF NOT EXISTS helpdesk_tickets_customer_email_idx
  ON public.helpdesk_tickets(customer_email)
  WHERE customer_email IS NOT NULL;

-- ─── 2. helpdesk_ticket_messages ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  direction text NOT NULL,
  body text NOT NULL,
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text,
  sender_email text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_messages_direction_check
    CHECK (direction IN ('inbound', 'outbound', 'internal_note'))
);

CREATE INDEX IF NOT EXISTS helpdesk_ticket_messages_ticket_sent_at_idx
  ON public.helpdesk_ticket_messages(ticket_id, sent_at ASC);

-- ─── 3. helpdesk_ticket_watchers ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  watcher_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_name text,
  staff_email text,
  contact_email text,
  contact_name text,
  is_permanent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_watchers_type_check
    CHECK (watcher_type IN ('internal_user', 'non_user_staff', 'external_contact')),
  CONSTRAINT helpdesk_ticket_watchers_unique_user
    UNIQUE (ticket_id, user_id),
  CONSTRAINT helpdesk_ticket_watchers_type_fields CHECK (
    (watcher_type = 'internal_user' AND user_id IS NOT NULL)
    OR (watcher_type = 'non_user_staff' AND staff_email IS NOT NULL)
    OR (watcher_type = 'external_contact' AND contact_email IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS helpdesk_ticket_watchers_ticket_id_idx
  ON public.helpdesk_ticket_watchers(ticket_id);

-- ─── 4. helpdesk_followup_queue ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.helpdesk_followup_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  followup_type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_followup_queue_type_check
    CHECK (followup_type IN ('first_response_breach', 'resolution_breach', 'idle_assignee', 'idle_customer'))
);

CREATE INDEX IF NOT EXISTS helpdesk_followup_queue_scheduled_idx
  ON public.helpdesk_followup_queue(scheduled_for)
  WHERE sent_at IS NULL AND cancelled_at IS NULL;

-- ─── 5. SLA pause/resume trigger ───────────────────────────────────────────────
-- Fires BEFORE UPDATE so it can modify NEW before the AFTER UPDATE SLA recompute trigger.
-- When stage changes to a closed stage: sets sla_paused_at.
-- When stage changes away from a closed stage: accumulates paused seconds and clears sla_paused_at.

CREATE OR REPLACE FUNCTION public.helpdesk_manage_sla_pause()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_closed BOOLEAN;
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id AND NEW.stage_id IS NOT NULL THEN
    SELECT is_closed INTO v_is_closed
    FROM public.helpdesk_ticket_stages
    WHERE id = NEW.stage_id;

    IF COALESCE(v_is_closed, false) AND NEW.sla_paused_at IS NULL THEN
      -- Moving into a closed/on-hold stage: start the pause clock
      NEW.sla_paused_at := now();
    ELSIF NOT COALESCE(v_is_closed, false) AND OLD.sla_paused_at IS NOT NULL THEN
      -- Leaving a closed/on-hold stage: accumulate paused duration and clear the clock
      NEW.sla_paused_duration_seconds := NEW.sla_paused_duration_seconds
        + EXTRACT(EPOCH FROM (now() - OLD.sla_paused_at))::integer;
      NEW.sla_paused_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_sla_pause_trigger ON public.helpdesk_tickets;
CREATE TRIGGER helpdesk_sla_pause_trigger
  BEFORE UPDATE OF stage_id ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.helpdesk_manage_sla_pause();

-- ─── 6. close_helpdesk_ticket_by_token RPC ─────────────────────────────────────
-- Callable by anon (email link buttons). Validates contact_token, sets stage to the
-- first closed stage for that ticket's team, logs a ticket_closed_by_customer event.

CREATE OR REPLACE FUNCTION public.close_helpdesk_ticket_by_token(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
  v_team_id uuid;
  v_closed_stage_id uuid;
BEGIN
  SELECT id, team_id
  INTO v_ticket_id, v_team_id
  FROM public.helpdesk_tickets
  WHERE contact_token = p_token;

  IF v_ticket_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Find the first closed stage for this team (or any global closed stage)
  SELECT id INTO v_closed_stage_id
  FROM public.helpdesk_ticket_stages
  WHERE is_closed = true
    AND (team_id = v_team_id OR team_id IS NULL)
  ORDER BY sequence DESC
  LIMIT 1;

  IF v_closed_stage_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.helpdesk_tickets
  SET
    stage_id = v_closed_stage_id,
    closed_at = now(),
    updated_at = now()
  WHERE id = v_ticket_id;

  INSERT INTO public.helpdesk_ticket_events (ticket_id, event_type, payload)
  VALUES (v_ticket_id, 'ticket_closed_by_customer', '{"source":"email_link"}'::jsonb);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_helpdesk_ticket_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.close_helpdesk_ticket_by_token(uuid) TO authenticated;

-- ─── 7. RLS for new tables ──────────────────────────────────────────────────────

ALTER TABLE public.helpdesk_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket messages" ON public.helpdesk_ticket_messages;
CREATE POLICY "Authenticated users can view helpdesk ticket messages"
  ON public.helpdesk_ticket_messages FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can manage helpdesk ticket messages" ON public.helpdesk_ticket_messages;
CREATE POLICY "Editors can manage helpdesk ticket messages"
  ON public.helpdesk_ticket_messages FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

ALTER TABLE public.helpdesk_ticket_watchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket watchers" ON public.helpdesk_ticket_watchers;
CREATE POLICY "Authenticated users can view helpdesk ticket watchers"
  ON public.helpdesk_ticket_watchers FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can manage helpdesk ticket watchers" ON public.helpdesk_ticket_watchers;
CREATE POLICY "Editors can manage helpdesk ticket watchers"
  ON public.helpdesk_ticket_watchers FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

ALTER TABLE public.helpdesk_followup_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view helpdesk followup queue" ON public.helpdesk_followup_queue;
CREATE POLICY "Authenticated users can view helpdesk followup queue"
  ON public.helpdesk_followup_queue FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can manage helpdesk followup queue" ON public.helpdesk_followup_queue;
CREATE POLICY "Editors can manage helpdesk followup queue"
  ON public.helpdesk_followup_queue FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

NOTIFY pgrst, 'reload schema';
