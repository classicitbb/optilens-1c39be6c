-- Live Helpdesk conversations: durable messages, authenticated delivery, and one
-- server-authoritative send path. Realtime messages contain identifiers only;
-- every client reads message content through the existing table RLS policy.

ALTER TABLE public.helpdesk_ticket_messages
  ADD COLUMN IF NOT EXISTS client_message_id uuid;

UPDATE public.helpdesk_ticket_messages
SET client_message_id = gen_random_uuid()
WHERE client_message_id IS NULL;

ALTER TABLE public.helpdesk_ticket_messages
  ALTER COLUMN client_message_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS helpdesk_ticket_messages_ticket_client_message_idx
  ON public.helpdesk_ticket_messages(ticket_id, client_message_id);

-- Direct browser inserts let a customer forge an outbound/internal direction and
-- split a message from its audit event. The RPC below is the sole write seam.
REVOKE INSERT, UPDATE, DELETE ON public.helpdesk_ticket_messages FROM authenticated;

DROP POLICY IF EXISTS "Ticket owners can create messages" ON public.helpdesk_ticket_messages;
DROP POLICY IF EXISTS "Editors can manage helpdesk ticket messages" ON public.helpdesk_ticket_messages;
DROP POLICY IF EXISTS "Staff can manage all ticket messages" ON public.helpdesk_ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket messages" ON public.helpdesk_ticket_messages;
DROP POLICY IF EXISTS "Ticket participants can read messages" ON public.helpdesk_ticket_messages;

CREATE POLICY "Ticket participants can read messages"
  ON public.helpdesk_ticket_messages FOR SELECT TO authenticated
  USING (
    public.has_edit_role(auth.uid())
    OR (
      public.can_access_customer_portal_feature(auth.uid(), 'helpdesk')
      AND EXISTS (
        SELECT 1
        FROM public.helpdesk_tickets t
        WHERE t.id = helpdesk_ticket_messages.ticket_id
          AND (
            t.owner_user_id = auth.uid()
            OR t.partner_contact_id IN (
              SELECT p.crm_contact_id
              FROM public.profiles p
              WHERE p.user_id = auth.uid()
                AND p.crm_contact_id IS NOT NULL
            )
          )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.send_helpdesk_ticket_message(
  p_ticket_id uuid,
  p_body text,
  p_client_message_id uuid,
  p_internal_note boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  ticket_id uuid,
  direction text,
  body text,
  sender_user_id uuid,
  sender_name text,
  sender_email text,
  sent_at timestamptz,
  created_at timestamptz,
  client_message_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_staff boolean := false;
  v_is_participant boolean := false;
  v_direction text;
  v_message public.helpdesk_ticket_messages%ROWTYPE;
  v_created boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to send a Helpdesk message';
  END IF;

  IF p_ticket_id IS NULL OR p_client_message_id IS NULL THEN
    RAISE EXCEPTION 'A ticket and client message identifier are required';
  END IF;

  p_body := btrim(COALESCE(p_body, ''));
  IF p_body = '' THEN
    RAISE EXCEPTION 'A Helpdesk message cannot be empty';
  END IF;
  IF char_length(p_body) > 12000 THEN
    RAISE EXCEPTION 'A Helpdesk message is too long';
  END IF;

  SELECT public.has_edit_role(v_user_id) INTO v_is_staff;

  SELECT EXISTS (
    SELECT 1
    FROM public.helpdesk_tickets t
    WHERE t.id = p_ticket_id
      AND (
        t.owner_user_id = v_user_id
        OR t.partner_contact_id IN (
          SELECT p.crm_contact_id
          FROM public.profiles p
          WHERE p.user_id = v_user_id
            AND p.crm_contact_id IS NOT NULL
        )
      )
  ) INTO v_is_participant;

  IF NOT v_is_staff AND (
    NOT v_is_participant
    OR NOT public.can_access_customer_portal_feature(v_user_id, 'helpdesk')
  ) THEN
    RAISE EXCEPTION 'You cannot send messages on this Helpdesk ticket';
  END IF;

  IF p_internal_note AND NOT v_is_staff THEN
    RAISE EXCEPTION 'Only staff can add internal Helpdesk notes';
  END IF;

  v_direction := CASE
    WHEN p_internal_note THEN 'internal_note'
    WHEN v_is_staff THEN 'outbound'
    ELSE 'inbound'
  END;

  INSERT INTO public.helpdesk_ticket_messages (
    ticket_id,
    direction,
    body,
    sender_user_id,
    client_message_id
  ) VALUES (
    p_ticket_id,
    v_direction,
    p_body,
    v_user_id,
    p_client_message_id
  )
  ON CONFLICT (ticket_id, client_message_id) DO NOTHING
  RETURNING * INTO v_message;

  v_created := FOUND;
  IF NOT v_created THEN
    SELECT * INTO v_message
    FROM public.helpdesk_ticket_messages
    WHERE ticket_id = p_ticket_id
      AND client_message_id = p_client_message_id;
  END IF;

  -- A duplicate retry returns the original message without duplicating timeline
  -- activity or changing SLA timestamps.
  IF v_created THEN
    IF v_direction = 'outbound' THEN
      UPDATE public.helpdesk_tickets
      SET first_response_at = COALESCE(first_response_at, v_message.sent_at)
      WHERE helpdesk_tickets.id = p_ticket_id;
    END IF;

    INSERT INTO public.helpdesk_ticket_events (ticket_id, event_type, actor_user_id, payload)
    VALUES (
      p_ticket_id,
      CASE v_direction WHEN 'outbound' THEN 'reply_sent' WHEN 'inbound' THEN 'customer_reply' ELSE 'internal_note_added' END,
      v_user_id,
      jsonb_build_object('message_id', v_message.id)
    );
  END IF;

  RETURN QUERY
  SELECT
    v_message.id,
    v_message.ticket_id,
    v_message.direction,
    v_message.body,
    v_message.sender_user_id,
    v_message.sender_name,
    v_message.sender_email,
    v_message.sent_at,
    v_message.created_at,
    v_message.client_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_helpdesk_ticket_message(uuid, text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_helpdesk_ticket_message(uuid, text, uuid, boolean) TO authenticated;

-- The Realtime payload contains no message body. This keeps it inexpensive and
-- makes the normal RLS-protected query the only source of conversation content.
CREATE OR REPLACE FUNCTION public.broadcast_helpdesk_ticket_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime, pg_temp
AS $$
BEGIN
  IF NEW.direction <> 'internal_note' THEN
    PERFORM realtime.send(
      jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id, 'kind', 'message_created'),
      'message_created',
      'helpdesk:ticket:' || NEW.ticket_id::text,
      true
    );
  END IF;

  IF NEW.direction = 'inbound' THEN
    PERFORM realtime.send(
      jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id, 'kind', 'customer_message'),
      'customer_message',
      'helpdesk:inbox',
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_ticket_message_broadcast_trigger ON public.helpdesk_ticket_messages;
CREATE TRIGGER helpdesk_ticket_message_broadcast_trigger
  AFTER INSERT ON public.helpdesk_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_helpdesk_ticket_message();

CREATE OR REPLACE FUNCTION public.broadcast_helpdesk_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime, pg_temp
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('ticket_id', NEW.id, 'kind', 'ticket_created'),
    'ticket_created',
    'helpdesk:inbox',
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_ticket_created_broadcast_trigger ON public.helpdesk_tickets;
CREATE TRIGGER helpdesk_ticket_created_broadcast_trigger
  AFTER INSERT ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_helpdesk_ticket_created();

CREATE OR REPLACE FUNCTION public.broadcast_helpdesk_ticket_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime, pg_temp
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('ticket_id', NEW.id, 'kind', 'ticket_updated'),
    'ticket_updated',
    'helpdesk:ticket:' || NEW.id::text,
    true
  );
  PERFORM realtime.send(
    jsonb_build_object('ticket_id', NEW.id, 'kind', 'ticket_updated'),
    'ticket_updated',
    'helpdesk:inbox',
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_ticket_updated_broadcast_trigger ON public.helpdesk_tickets;
CREATE TRIGGER helpdesk_ticket_updated_broadcast_trigger
  AFTER UPDATE OF stage_id, closed_at ON public.helpdesk_tickets
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id OR OLD.closed_at IS DISTINCT FROM NEW.closed_at)
  EXECUTE FUNCTION public.broadcast_helpdesk_ticket_updated();

CREATE OR REPLACE FUNCTION public.close_helpdesk_ticket_for_participant(p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_closed_stage_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to close a Helpdesk ticket';
  END IF;

  SELECT t.team_id INTO v_team_id
  FROM public.helpdesk_tickets t
  WHERE t.id = p_ticket_id
    AND (
      public.has_edit_role(v_user_id)
      OR (
        public.can_access_customer_portal_feature(v_user_id, 'helpdesk')
        AND (
          t.owner_user_id = v_user_id
          OR t.partner_contact_id IN (
            SELECT p.crm_contact_id
            FROM public.profiles p
            WHERE p.user_id = v_user_id
              AND p.crm_contact_id IS NOT NULL
          )
        )
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You cannot close this Helpdesk ticket';
  END IF;

  SELECT id INTO v_closed_stage_id
  FROM public.helpdesk_ticket_stages
  WHERE is_closed = true
    AND (team_id = v_team_id OR team_id IS NULL)
  ORDER BY sequence ASC
  LIMIT 1;

  IF v_closed_stage_id IS NULL THEN
    RAISE EXCEPTION 'No closed Helpdesk stage is configured';
  END IF;

  UPDATE public.helpdesk_tickets
  SET stage_id = v_closed_stage_id,
      closed_at = now(),
      updated_at = now()
  WHERE id = p_ticket_id
    AND closed_at IS NULL;

  IF FOUND THEN
    INSERT INTO public.helpdesk_ticket_events (ticket_id, event_type, actor_user_id, payload)
    VALUES (p_ticket_id, 'ticket_closed_by_customer', v_user_id, '{"source":"portal"}'::jsonb);
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.close_helpdesk_ticket_for_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_helpdesk_ticket_for_participant(uuid) TO authenticated;

-- Private topic authorization. An operator can see the inbox. A customer can
-- join only a ticket they can already read through Helpdesk RLS.
DROP POLICY IF EXISTS "Helpdesk participants receive live ticket updates" ON realtime.messages;
CREATE POLICY "Helpdesk participants receive live ticket updates"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
    AND (
      (
        realtime.topic() = 'helpdesk:inbox'
        AND public.has_edit_role(auth.uid())
      )
      OR (
        realtime.topic() LIKE 'helpdesk:ticket:%'
        AND (
          public.has_edit_role(auth.uid())
          OR (
            public.can_access_customer_portal_feature(auth.uid(), 'helpdesk')
            AND EXISTS (
              SELECT 1
              FROM public.helpdesk_tickets t
              WHERE t.id::text = split_part(realtime.topic(), ':', 3)
                AND (
                  t.owner_user_id = auth.uid()
                  OR t.partner_contact_id IN (
                    SELECT p.crm_contact_id
                    FROM public.profiles p
                    WHERE p.user_id = auth.uid()
                      AND p.crm_contact_id IS NOT NULL
                  )
                )
            )
          )
        )
      )
    )
  );

NOTIFY pgrst, 'reload schema';
