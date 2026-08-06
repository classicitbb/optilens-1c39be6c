-- Route customer quote requests through the existing Helpdesk conversation.
-- The RPC is the only customer-facing write path for submitted STOCK requests:
-- quote, ticket, event, and link are committed or rolled back together.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS helpdesk_ticket_id uuid;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_helpdesk_ticket_id_fkey;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_helpdesk_ticket_id_fkey
  FOREIGN KEY (helpdesk_ticket_id)
  REFERENCES public.helpdesk_tickets(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quotes_helpdesk_ticket_id_key
  ON public.quotes(helpdesk_ticket_id)
  WHERE helpdesk_ticket_id IS NOT NULL;

-- Keep the customer view security-invoker and append the canonical ticket link.
CREATE OR REPLACE VIEW public.quotes_customer
WITH (security_invoker = true) AS
SELECT
  id,
  quote_number,
  quote_type,
  status,
  customer_name,
  account_id,
  contact_name,
  contact_email,
  contact_phone,
  currency,
  valid_until,
  lead_time_days,
  notes_customer,
  subtotal_sell,
  grand_total,
  created_by,
  created_at,
  updated_at,
  helpdesk_ticket_id
FROM public.quotes
WHERE created_by = auth.uid()
  AND public.can_access_customer_portal_feature(auth.uid(), 'quotes');

REVOKE ALL ON public.quotes_customer FROM PUBLIC;
REVOKE ALL ON public.quotes_customer FROM anon;
REVOKE ALL ON public.quotes_customer FROM authenticated;
REVOKE ALL ON public.quotes_customer FROM service_role;
GRANT SELECT ON public.quotes_customer TO authenticated;
GRANT SELECT ON public.quotes_customer TO service_role;

-- Customers may continue editing their RX drafts, but a submitted STOCK
-- request is immutable for them. Existing staff UPDATE policies still apply.
DROP POLICY IF EXISTS "Customers manage own rx quotes" ON public.quotes;
CREATE POLICY "Customers manage own rx quotes"
  ON public.quotes FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND quote_type = 'RX'
    AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
  )
  WITH CHECK (
    created_by = auth.uid()
    AND quote_type = 'RX'
    AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    AND (account_id IS NULL OR public.can_access_portal_account(account_id, auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.submit_customer_quote_request(
  p_customer_name text,
  p_request_details text,
  p_account_id integer DEFAULT NULL
)
RETURNS TABLE(
  quote_id uuid,
  quote_number text,
  ticket_id uuid,
  ticket_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_customer_name text := btrim(coalesce(p_customer_name, ''));
  v_request_details text := btrim(coalesce(p_request_details, ''));
  v_contact_id uuid;
  v_contact_email text := nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), '');
  v_quote_id uuid;
  v_quote_number text;
  v_ticket_id uuid := gen_random_uuid();
  v_ticket_number text := 'PTL-' || upper(substr(replace(v_ticket_id::text, '-', ''), 1, 12));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_access_customer_portal_feature(v_user_id, 'quotes') THEN
    RAISE EXCEPTION 'Quote requests are not enabled for this portal account' USING ERRCODE = '42501';
  END IF;

  IF p_account_id IS NOT NULL AND NOT public.can_access_portal_account(p_account_id, v_user_id) THEN
    RAISE EXCEPTION 'Customer account is not available to this portal user' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_customer_name) = 0 OR char_length(v_customer_name) > 200 THEN
    RAISE EXCEPTION 'Customer or business name is required and must be 200 characters or fewer' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_request_details) = 0 OR char_length(v_request_details) > 10000 THEN
    RAISE EXCEPTION 'Request details are required and must be 10000 characters or fewer' USING ERRCODE = '22023';
  END IF;

  SELECT profile.crm_contact_id
  INTO v_contact_id
  FROM public.profiles AS profile
  WHERE profile.user_id = v_user_id
  LIMIT 1;

  INSERT INTO public.helpdesk_tickets (
    id,
    tenant_key,
    ticket_number,
    title,
    description,
    priority,
    partner_contact_id,
    owner_user_id,
    opened_at,
    source_channel,
    source_route_context,
    source_metadata
  ) VALUES (
    v_ticket_id,
    'default',
    v_ticket_number,
    'Quote request - ' || v_customer_name,
    v_request_details,
    1,
    v_contact_id,
    v_user_id,
    now(),
    'portal',
    '/profile/quotes',
    jsonb_build_object('subtype', 'quote_request', 'customer_name', v_customer_name)
  );

  INSERT INTO public.quotes (
    created_by,
    quote_type,
    customer_name,
    contact_email,
    notes_customer,
    quote_number,
    account_id,
    helpdesk_ticket_id
  ) VALUES (
    v_user_id,
    'STOCK',
    v_customer_name,
    v_contact_email,
    v_request_details,
    '',
    p_account_id,
    v_ticket_id
  )
  RETURNING id, quotes.quote_number INTO v_quote_id, v_quote_number;

  UPDATE public.helpdesk_tickets
  SET source_metadata = source_metadata || jsonb_build_object(
    'quote_id', v_quote_id,
    'quote_number', v_quote_number
  )
  WHERE id = v_ticket_id;

  INSERT INTO public.helpdesk_ticket_events (
    ticket_id,
    event_type,
    actor_user_id,
    payload
  ) VALUES (
    v_ticket_id,
    'ticket_created',
    v_user_id,
    jsonb_build_object(
      'source_channel', 'portal',
      'subtype', 'quote_request',
      'quote_id', v_quote_id,
      'quote_number', v_quote_number
    )
  );

  RETURN QUERY SELECT v_quote_id, v_quote_number, v_ticket_id, v_ticket_number;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_customer_quote_request(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_customer_quote_request(text, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_customer_quote_request(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_customer_quote_request(text, text, integer) TO service_role;

COMMENT ON FUNCTION public.submit_customer_quote_request(text, text, integer) IS
  'Atomically creates an immutable customer STOCK quote request and its linked Helpdesk ticket.';

NOTIFY pgrst, 'reload schema';
