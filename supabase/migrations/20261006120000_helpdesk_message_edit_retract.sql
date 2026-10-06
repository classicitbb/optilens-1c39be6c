-- Let the author of a Helpdesk message (staff reply, internal note, or customer
-- reply) correct or withdraw it. Browser writes to the table stay revoked; the
-- two RPCs below are the only seam. The text that was replaced or withdrawn is
-- kept in a staff-only revision table, and every change lands on the ticket
-- timeline.

ALTER TABLE public.helpdesk_ticket_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS retracted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_message_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.helpdesk_ticket_messages(id) ON DELETE CASCADE,
  body text NOT NULL,
  action text NOT NULL CHECK (action IN ('edited', 'retracted')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS helpdesk_ticket_message_revisions_message_idx
  ON public.helpdesk_ticket_message_revisions(message_id, created_at);

ALTER TABLE public.helpdesk_ticket_message_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.helpdesk_ticket_message_revisions FROM anon, authenticated;
GRANT SELECT ON public.helpdesk_ticket_message_revisions TO authenticated;

DROP POLICY IF EXISTS "Staff can read helpdesk message revisions" ON public.helpdesk_ticket_message_revisions;
CREATE POLICY "Staff can read helpdesk message revisions"
  ON public.helpdesk_ticket_message_revisions FOR SELECT TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Shared guard: returns the caller's own, still-live message or raises.
CREATE OR REPLACE FUNCTION public.lock_own_helpdesk_message(p_message_id uuid)
RETURNS public.helpdesk_ticket_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message public.helpdesk_ticket_messages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to change a Helpdesk message';
  END IF;

  SELECT * INTO v_message
  FROM public.helpdesk_ticket_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND OR v_message.sender_user_id IS DISTINCT FROM v_user_id OR v_message.is_automated THEN
    RAISE EXCEPTION 'You can only change messages you sent';
  END IF;

  IF v_message.retracted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This message has already been retracted';
  END IF;

  -- Staff may always correct their own messages. A customer needs the same
  -- portal access they needed to send it, and cannot rewrite a closed ticket.
  IF NOT public.has_edit_role(v_user_id) THEN
    IF NOT public.can_access_customer_portal_feature(v_user_id, 'helpdesk') THEN
      RAISE EXCEPTION 'You cannot change messages on this Helpdesk ticket';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.helpdesk_tickets t
      WHERE t.id = v_message.ticket_id AND t.closed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'This ticket is closed, so its messages can no longer be changed';
    END IF;
  END IF;

  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_own_helpdesk_message(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.edit_helpdesk_ticket_message(p_message_id uuid, p_body text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_message public.helpdesk_ticket_messages%ROWTYPE := public.lock_own_helpdesk_message(p_message_id);
BEGIN
  p_body := btrim(COALESCE(p_body, ''));
  IF p_body = '' THEN
    RAISE EXCEPTION 'A Helpdesk message cannot be empty';
  END IF;
  IF char_length(p_body) > 12000 THEN
    RAISE EXCEPTION 'A Helpdesk message is too long';
  END IF;

  IF p_body = v_message.body THEN
    RETURN true;
  END IF;

  INSERT INTO public.helpdesk_ticket_message_revisions (message_id, body, action, actor_user_id)
  VALUES (v_message.id, v_message.body, 'edited', auth.uid());

  UPDATE public.helpdesk_ticket_messages
  SET body = p_body, edited_at = now()
  WHERE id = v_message.id;

  INSERT INTO public.helpdesk_ticket_events (ticket_id, event_type, actor_user_id, payload)
  VALUES (v_message.ticket_id, 'message_edited', auth.uid(),
    jsonb_build_object('message_id', v_message.id, 'direction', v_message.direction));

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.retract_helpdesk_ticket_message(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_message public.helpdesk_ticket_messages%ROWTYPE := public.lock_own_helpdesk_message(p_message_id);
BEGIN
  INSERT INTO public.helpdesk_ticket_message_revisions (message_id, body, action, actor_user_id)
  VALUES (v_message.id, v_message.body, 'retracted', auth.uid());

  -- The row stays so the thread keeps its shape, but the text is cleared so no
  -- reader (customer or staff) can still see what was withdrawn.
  UPDATE public.helpdesk_ticket_messages
  SET body = '', retracted_at = now()
  WHERE id = v_message.id;

  INSERT INTO public.helpdesk_ticket_events (ticket_id, event_type, actor_user_id, payload)
  VALUES (v_message.ticket_id, 'message_retracted', auth.uid(),
    jsonb_build_object('message_id', v_message.id, 'direction', v_message.direction));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_helpdesk_ticket_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.retract_helpdesk_ticket_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_helpdesk_ticket_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retract_helpdesk_ticket_message(uuid) TO authenticated;

-- Live delivery: identifier-only, like message_created. Internal notes stay off
-- the customer's topic.
CREATE OR REPLACE FUNCTION public.broadcast_helpdesk_ticket_message_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime, pg_temp
AS $$
BEGIN
  IF NEW.direction <> 'internal_note' THEN
    PERFORM realtime.send(
      jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id, 'kind', 'message_updated'),
      'message_updated',
      'helpdesk:ticket:' || NEW.ticket_id::text,
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_ticket_message_updated_broadcast_trigger ON public.helpdesk_ticket_messages;
CREATE TRIGGER helpdesk_ticket_message_updated_broadcast_trigger
  AFTER UPDATE OF body, edited_at, retracted_at ON public.helpdesk_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_helpdesk_ticket_message_updated();

NOTIFY pgrst, 'reload schema';
