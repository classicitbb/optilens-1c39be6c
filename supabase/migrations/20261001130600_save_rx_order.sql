-- Rx order data model, Phase 0 (part 7): the one atomic save.
--
-- save_rx_order(p_quote_id, p_payload, p_is_test) replaces the client-side
-- persistPayload sequence (create quote on page load; delete every line; insert
-- again; update header) in which a failure partway left a half-written quote.
-- Everything below runs in ONE transaction: it either all lands or none does.
--
--  * p_quote_id NULL  -> creates the RX quote on first save, so merely opening
--                        the form no longer creates one, and assigns the order
--                        number from rx_order_number_seq.
--  * Validates the payload and who may write it; totals are summed from the
--    lines SERVER-SIDE (the client's total is never trusted).
--  * Surcharge lines (line_type 'Fee') must name a live rx_surcharge_rules
--    code in group_key as 'surcharge:<code>'.
--  * Locks after release: a submission past 'pending_review' blocks every
--    edit; a customer is also locked out once any submission exists unless it
--    is still 'pending_review'. Void/Rejected/Expired quotes are locked.
--
-- NOT yet done here (Phase 1 'domain/price.ts', shared with an edge check):
-- independently re-pricing the lens and coatings. Lens/coating prices are
-- still taken from the line payload; only the arithmetic, the surcharge
-- identity and the access rules are enforced server-side.
--
-- Note: the protect_quote_cost_fields / protect_quote_line_cost_fields
-- triggers still apply to non-staff callers, so a customer's header totals and
-- line cost columns are zeroed exactly as they are today.
--
-- p_payload shape:
--   { "schema": "cv.rxorder/1" | "cv.rxorder/2",
--     "order":  <the whole order payload, stored as quotes.rx_payload>,
--     "header": { account_id, customer_name, contact_name, notes_customer, currency },
--     "lines":  [ { line_type, product_id, innovations_alias, sku, item_name, qty,
--                   unit_cost_landed_bbd, unit_base_price_bbd, unit_sell_price_bbd,
--                   threshold_percent, gp_amount, gp_percent, profit_status,
--                   threshold_status, group_key, sort_order,
--                   needs_assistance, assistance_note } ],
--     "rx":     { od_sph, ..., od_height, os_height, fitting_height, rx_notes } | null,
--     "frame":  { job_scope, brand, model_colour, mount_type, a_mm, ... } | null }
-- Returns { quote_id, quote_number, rx_order_number, total, created }.

CREATE OR REPLACE FUNCTION public.save_rx_order(
  p_quote_id uuid,
  p_payload jsonb,
  p_is_test boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_staff      boolean;
  v_header     jsonb := COALESCE(p_payload -> 'header', '{}'::jsonb);
  v_lines      jsonb := COALESCE(p_payload -> 'lines', '[]'::jsonb);
  v_rx         jsonb := p_payload -> 'rx';
  v_frame      jsonb := p_payload -> 'frame';
  v_account    integer;
  v_quote      public.quotes%ROWTYPE;
  v_created    boolean := false;
  v_first_lens uuid;
  v_total      numeric := 0;
  v_cost       numeric := 0;
  v_bad        text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to save an Rx order.' USING ERRCODE = '28000';
  END IF;
  v_staff := public.has_edit_role(v_uid);

  IF NOT v_staff AND NOT public.can_access_customer_portal_feature(v_uid, 'rx-order') THEN
    RAISE EXCEPTION 'The Rx order form is not enabled for this account.' USING ERRCODE = '42501';
  END IF;
  IF p_is_test AND NOT v_staff THEN
    RAISE EXCEPTION 'Only staff can save test orders.' USING ERRCODE = '42501';
  END IF;

  -- payload validation -------------------------------------------------------
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Rx order payload must be an object.' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_payload ->> 'schema', '') NOT IN ('cv.rxorder/1', 'cv.rxorder/2') THEN
    RAISE EXCEPTION 'Unsupported Rx order schema: %', COALESCE(p_payload ->> 'schema', '(none)')
      USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(v_lines) <> 'array' THEN
    RAISE EXCEPTION 'Rx order lines must be an array.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(p_payload -> 'order', '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Rx order body must be an object.' USING ERRCODE = '22023';
  END IF;

  SELECT string_agg(format('line %s: %s', ord, problem), '; ') INTO v_bad
  FROM (
    SELECT ord,
      CASE
        WHEN l ->> 'line_type' IS NULL
          OR l ->> 'line_type' NOT IN ('Lens', 'AddOn', 'Supply', 'Fee', 'Discount', 'Stock')
          THEN 'unknown line_type'
        WHEN NOT v_staff AND l ->> 'line_type' IN ('Discount', 'Stock', 'Supply')
          THEN 'line_type not allowed'
        WHEN COALESCE(btrim(l ->> 'item_name'), '') = '' THEN 'missing item_name'
        WHEN COALESCE((l ->> 'qty')::numeric, 0) <= 0 THEN 'qty must be positive'
        WHEN COALESCE((l ->> 'unit_sell_price_bbd')::numeric, 0) < 0
             AND l ->> 'line_type' <> 'Discount' THEN 'negative price'
        WHEN l ->> 'line_type' = 'Fee' AND NOT EXISTS (
               SELECT 1 FROM public.rx_surcharge_rules r
               WHERE r.active AND l ->> 'group_key' = 'surcharge:' || r.code
             ) THEN 'surcharge must cite an active rx_surcharge_rules code in group_key'
      END AS problem
    FROM jsonb_array_elements(v_lines) WITH ORDINALITY AS t(l, ord)
  ) x
  WHERE problem IS NOT NULL;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid Rx order lines: %', v_bad USING ERRCODE = '22023';
  END IF;

  -- account --------------------------------------------------------------------
  v_account := NULLIF(v_header ->> 'account_id', '')::integer;
  IF v_account IS NOT NULL AND NOT v_staff AND NOT public.can_access_portal_account(v_account, v_uid) THEN
    RAISE EXCEPTION 'You do not have access to that account.' USING ERRCODE = '42501';
  END IF;

  -- find or create the quote ---------------------------------------------------
  IF p_quote_id IS NULL THEN
    INSERT INTO public.quotes (quote_type, status, customer_name, account_id, created_by, is_test, rx_order_number)
    VALUES ('RX', 'Draft', COALESCE(v_header ->> 'customer_name', ''), v_account, v_uid, p_is_test,
            nextval('public.rx_order_number_seq'))
    RETURNING * INTO v_quote;
    v_created := true;
  ELSE
    SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
    IF NOT FOUND OR v_quote.quote_type <> 'RX' THEN
      RAISE EXCEPTION 'Rx order not found.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT v_staff AND v_quote.created_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Rx order not found.' USING ERRCODE = 'P0002';
    END IF;
    IF v_quote.status IN ('Void', 'Rejected', 'Expired') THEN
      RAISE EXCEPTION 'This Rx order is closed and can no longer be edited.' USING ERRCODE = '55006';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.rx_order_submissions s
      WHERE s.quote_id = v_quote.id
        AND (s.status IN ('approved', 'claimed', 'submitted')
             OR (NOT v_staff AND s.status <> 'pending_review'))
    ) THEN
      RAISE EXCEPTION 'This Rx order has been released and can no longer be edited.' USING ERRCODE = '55006';
    END IF;
    IF v_quote.rx_order_number IS NULL THEN
      v_quote.rx_order_number := nextval('public.rx_order_number_seq');
    END IF;
  END IF;

  -- lines: replace atomically (rx_details cascades from quote_lines) -----------
  DELETE FROM public.quote_lines WHERE quote_id = v_quote.id;

  INSERT INTO public.quote_lines (
    quote_id, line_type, product_id, innovations_alias, sku, item_name, qty,
    unit_cost_landed_bbd, unit_base_price_bbd, unit_sell_price_bbd,
    threshold_percent, gp_amount, gp_percent, profit_status, threshold_status,
    group_key, sort_order, needs_assistance, assistance_note
  )
  SELECT
    v_quote.id,
    l ->> 'line_type',
    NULLIF(l ->> 'product_id', '')::uuid,
    NULLIF(l ->> 'innovations_alias', ''),
    COALESCE(l ->> 'sku', ''),
    l ->> 'item_name',
    (l ->> 'qty')::numeric,
    COALESCE((l ->> 'unit_cost_landed_bbd')::numeric, 0),
    COALESCE((l ->> 'unit_base_price_bbd')::numeric, (l ->> 'unit_sell_price_bbd')::numeric, 0),
    COALESCE((l ->> 'unit_sell_price_bbd')::numeric, 0),
    COALESCE((l ->> 'threshold_percent')::numeric, 0),
    COALESCE((l ->> 'gp_amount')::numeric, 0),
    COALESCE((l ->> 'gp_percent')::numeric, 0),
    COALESCE(l ->> 'profit_status', 'NoCost'),
    COALESCE(l ->> 'threshold_status', 'NoCost'),
    NULLIF(l ->> 'group_key', ''),
    COALESCE((l ->> 'sort_order')::integer, ord::integer),
    COALESCE((l ->> 'needs_assistance')::boolean, false),
    NULLIF(l ->> 'assistance_note', '')
  FROM jsonb_array_elements(v_lines) WITH ORDINALITY AS t(l, ord);

  -- totals come from the rows just written, never from the client --------------
  SELECT COALESCE(sum(qty * unit_sell_price_bbd), 0), COALESCE(sum(qty * unit_cost_landed_bbd), 0)
    INTO v_total, v_cost
  FROM public.quote_lines WHERE quote_id = v_quote.id;

  -- Both eyes stay on ONE rx_details row hung off the first lens line (see
  -- persistPayload); every reader downstream expects one row per job.
  SELECT id INTO v_first_lens
  FROM public.quote_lines
  WHERE quote_id = v_quote.id AND line_type = 'Lens'
  ORDER BY sort_order, created_at
  LIMIT 1;

  IF v_first_lens IS NOT NULL AND v_rx IS NOT NULL AND jsonb_typeof(v_rx) = 'object' THEN
    INSERT INTO public.rx_details
    SELECT * FROM jsonb_populate_record(
      NULL::public.rx_details,
      v_rx || jsonb_build_object(
        'id', gen_random_uuid(), 'quote_line_id', v_first_lens,
        'created_at', now(), 'updated_at', now())
    );
  END IF;

  -- frame: one row per quote ---------------------------------------------------
  DELETE FROM public.quote_frame_details WHERE quote_id = v_quote.id;
  IF v_frame IS NOT NULL AND jsonb_typeof(v_frame) = 'object' THEN
    INSERT INTO public.quote_frame_details
    SELECT * FROM jsonb_populate_record(
      NULL::public.quote_frame_details,
      jsonb_build_object('job_scope', 'full_glaze', 'is_uncut', false)
        || v_frame
        || jsonb_build_object(
             'id', gen_random_uuid(), 'quote_id', v_quote.id,
             'created_at', now(), 'updated_at', now())
    );
  END IF;

  -- header ---------------------------------------------------------------------
  UPDATE public.quotes SET
    account_id        = v_account,
    customer_name     = COALESCE(NULLIF(v_header ->> 'customer_name', ''), customer_name, 'Rx order'),
    contact_name      = NULLIF(v_header ->> 'contact_name', ''),
    notes_customer    = NULLIF(v_header ->> 'notes_customer', ''),
    currency          = COALESCE(NULLIF(v_header ->> 'currency', ''), currency),
    rx_payload        = COALESCE(p_payload -> 'order', '{}'::jsonb),
    rx_order_number   = v_quote.rx_order_number,
    subtotal_sell     = v_total,
    grand_total       = v_total,
    total_landed_cost = v_cost
  WHERE id = v_quote.id;

  IF v_created THEN
    PERFORM public.log_rx_order_event(
      v_quote.id, 'draft_created', NULL, 'Draft',
      jsonb_build_object('source', COALESCE(p_payload #>> '{order,source}', 'form'), 'is_test', p_is_test));
  ELSIF EXISTS (SELECT 1 FROM public.rx_order_submissions s WHERE s.quote_id = v_quote.id) THEN
    PERFORM public.log_rx_order_event(
      v_quote.id, 'edited_after_submit', NULL, NULL, jsonb_build_object('total', v_total));
  END IF;

  RETURN jsonb_build_object(
    'quote_id', v_quote.id,
    'quote_number', v_quote.quote_number,
    'rx_order_number', v_quote.rx_order_number,
    'total', v_total,
    'created', v_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_rx_order(uuid, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_rx_order(uuid, jsonb, boolean) TO authenticated;
