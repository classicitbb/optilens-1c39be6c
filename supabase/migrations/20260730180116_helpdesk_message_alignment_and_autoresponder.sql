-- Acknowledgements are stored as ordinary outbound messages so they are visible
-- in the same secure, realtime conversation. The marker prevents a reply loop
-- and guarantees one acknowledgement per ticket before a human responds.
ALTER TABLE public.helpdesk_ticket_messages
  ADD COLUMN IF NOT EXISTS is_automated boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.insert_helpdesk_ticket_autoresponse(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_local_time timestamp := timezone('America/Barbados', now());
  v_is_working_hours boolean;
BEGIN
  IF p_ticket_id IS NULL THEN
    RETURN;
  END IF;

  -- Do not send an automatic acknowledgement once this conversation has either
  -- been acknowledged already or has a human support response.
  IF EXISTS (
    SELECT 1
    FROM public.helpdesk_ticket_messages AS existing_message
    WHERE existing_message.ticket_id = p_ticket_id
      AND (
        existing_message.is_automated
        OR (existing_message.direction = 'outbound' AND NOT existing_message.is_automated)
      )
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.helpdesk_tickets AS ticket
    WHERE ticket.id = p_ticket_id
      AND ticket.closed_at IS NULL
  ) THEN
    RETURN;
  END IF;

  v_is_working_hours := extract(isodow FROM v_local_time) BETWEEN 1 AND 5
    AND v_local_time::time >= time '08:30'
    AND v_local_time::time < time '17:00';

  INSERT INTO public.helpdesk_ticket_messages (
    ticket_id,
    direction,
    body,
    sender_name,
    sender_email,
    is_automated,
    client_message_id
  ) VALUES (
    p_ticket_id,
    'outbound',
    CASE
      WHEN v_is_working_hours THEN
        'Thanks for contacting Classic Visions. We have received your request and our team is working on it. We will update you here as soon as we can.'
      ELSE
        'Thanks for contacting Classic Visions. We have received your request outside our working hours (Monday–Friday, 8:30 AM–5:00 PM Barbados time). Our team will review it on the next business day. If this is urgent, call +1 246 433-4928.'
    END,
    'Classic Visions Support',
    'accounts@classicvisions.net',
    true,
    gen_random_uuid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_helpdesk_ticket_autoresponse(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.autorespond_to_helpdesk_ticket_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Staff-created/manual tickets do not need a customer acknowledgement.
  IF NEW.source_channel IN ('portal', 'chat', 'ai_assistant') THEN
    PERFORM public.insert_helpdesk_ticket_autoresponse(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.autorespond_to_first_helpdesk_customer_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.direction = 'inbound' AND NOT NEW.is_automated THEN
    PERFORM public.insert_helpdesk_ticket_autoresponse(NEW.ticket_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_ticket_autoresponse_on_create ON public.helpdesk_tickets;
CREATE TRIGGER helpdesk_ticket_autoresponse_on_create
  AFTER INSERT ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.autorespond_to_helpdesk_ticket_creation();

DROP TRIGGER IF EXISTS helpdesk_ticket_autoresponse_on_customer_message ON public.helpdesk_ticket_messages;
CREATE TRIGGER helpdesk_ticket_autoresponse_on_customer_message
  AFTER INSERT ON public.helpdesk_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.autorespond_to_first_helpdesk_customer_message();

NOTIFY pgrst, 'reload schema';
