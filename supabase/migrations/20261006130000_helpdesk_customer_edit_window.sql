-- Customers can correct or retract a Helpdesk message for 15 minutes after
-- sending it. Staff are not limited. Replaces the guard from
-- 20261006120000_helpdesk_message_edit_retract.sql.
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
  -- portal access they needed to send it, cannot rewrite a closed ticket, and
  -- has 15 minutes from sending.
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
    IF now() > v_message.sent_at + interval '15 minutes' THEN
      RAISE EXCEPTION 'Messages can only be changed within 15 minutes of sending. Send a follow-up reply to correct it.';
    END IF;
  END IF;

  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_own_helpdesk_message(uuid) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
