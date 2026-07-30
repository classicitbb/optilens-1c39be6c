-- `RETURNS TABLE` exposes output-column names as PL/pgSQL variables. The
-- original function used ticket_id as both an output name and an unqualified
-- conflict/lookup column, which made an otherwise valid send fail with 42702.
-- Keep the public RPC signature stable and make every table reference explicit.
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
    FROM public.helpdesk_tickets AS ticket
    WHERE ticket.id = p_ticket_id
      AND (
        ticket.owner_user_id = v_user_id
        OR ticket.partner_contact_id IN (
          SELECT profile.crm_contact_id
          FROM public.profiles AS profile
          WHERE profile.user_id = v_user_id
            AND profile.crm_contact_id IS NOT NULL
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
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_message;

  v_created := FOUND;
  IF NOT v_created THEN
    SELECT existing_message.* INTO v_message
    FROM public.helpdesk_ticket_messages AS existing_message
    WHERE existing_message.ticket_id = p_ticket_id
      AND existing_message.client_message_id = p_client_message_id;
  END IF;

  IF v_created THEN
    IF v_direction = 'outbound' THEN
      UPDATE public.helpdesk_tickets AS ticket
      SET first_response_at = COALESCE(ticket.first_response_at, v_message.sent_at)
      WHERE ticket.id = p_ticket_id;
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

NOTIFY pgrst, 'reload schema';
