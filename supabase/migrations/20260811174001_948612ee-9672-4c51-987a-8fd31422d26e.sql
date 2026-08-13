CREATE OR REPLACE FUNCTION public.close_helpdesk_ticket_for_participant(p_ticket_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_ticket_id uuid;
  v_closed_stage_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to close a Helpdesk ticket';
  END IF;

  SELECT t.id INTO v_ticket_id
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

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'You cannot close this Helpdesk ticket';
  END IF;

  SELECT id INTO v_closed_stage_id
  FROM public.helpdesk_ticket_stages
  WHERE is_closed = true
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
$function$;