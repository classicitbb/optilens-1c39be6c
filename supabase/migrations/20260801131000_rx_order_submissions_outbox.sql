-- Innova integration, step 2: submission outbox + payment wiring.
--
-- DRAFTED FOR REVIEW — not run. You run all migrations yourself.
--
-- Design (INNOVA_INTEGRATION_ARCHITECTURE.md §2.5, simplified per the
-- 2026-08-01 review): CVWeb never talks to InnovaAPI directly — credentials
-- live office-side in optilens-local. Instead:
--
--   order paid/confirmed ──trigger──▶ rx_order_submissions (pending_review)
--   staff approves (manual-release gate) ──▶ approved
--   optilens-local worker polls via innovations-sync edge fn ──▶ claimed
--   worker builds RXI text + POSTs /process_rxi (or file-drop fallback)
--   worker writes back resultCode/resultMessage/RXTData ──▶ submitted|failed
--
-- The payload snapshot is assembled at enqueue time so the office worker
-- needs no read access to quote tables and later edits can't mutate what
-- was approved.

-- ── 1. Outbox table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rx_order_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        uuid NOT NULL UNIQUE REFERENCES public.quotes(id) ON DELETE CASCADE,
  order_id        uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  account_id      integer REFERENCES public.customers(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'pending_review'
                  CHECK (status IN ('pending_review','approved','claimed','submitted','failed','cancelled')),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- frozen snapshot, see build_rx_submission_payload
  transport       text,                                -- 'api' | 'file_drop' (set by the worker)
  mode            integer NOT NULL DEFAULT 1,          -- InnovaAPI /process_rxi mode
  result_code     integer,
  result_message  text,
  rxt_data        text,
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text,
  approved_by     uuid,
  approved_at     timestamptz,
  claimed_at      timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rx_order_submissions_status_idx
  ON public.rx_order_submissions (status, created_at);

ALTER TABLE public.rx_order_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role users can select rx_order_submissions" ON public.rx_order_submissions;
CREATE POLICY "Role users can select rx_order_submissions"
  ON public.rx_order_submissions FOR SELECT
  USING (public.has_any_role(auth.uid()));

-- Inserts come from the order trigger (definer) and the edge fn (service
-- role); status changes for staff go through the RPCs below. No direct
-- authenticated write policies on purpose.
DROP POLICY IF EXISTS "Admins can delete rx_order_submissions" ON public.rx_order_submissions;
CREATE POLICY "Admins can delete rx_order_submissions"
  ON public.rx_order_submissions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_rx_order_submissions_updated_at ON public.rx_order_submissions;
CREATE TRIGGER update_rx_order_submissions_updated_at
  BEFORE UPDATE ON public.rx_order_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. Payload builder (frozen snapshot of everything the RXI needs) ────────

CREATE OR REPLACE FUNCTION public.build_rx_submission_payload(p_quote_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'quote', (
      SELECT jsonb_build_object(
        'id', q.id, 'quote_number', q.quote_number,
        'customer_name', q.customer_name, 'contact_name', q.contact_name,
        'notes_customer', q.notes_customer, 'grand_total', q.grand_total,
        'currency', q.currency
      )
      FROM public.quotes q WHERE q.id = p_quote_id
    ),
    'account', (
      SELECT jsonb_build_object(
        'id', c.id, 'name', c.name, 'account_number', c.account_number,
        'innovations_customer_id', c.innovations_customer_id
      )
      FROM public.customers c
      JOIN public.quotes q ON q.account_id = c.id
      WHERE q.id = p_quote_id
    ),
    'frame', (
      SELECT to_jsonb(f) - 'id' - 'created_at' - 'updated_at'
      FROM public.quote_frame_details f WHERE f.quote_id = p_quote_id
    ),
    'lenses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'line_id', ql.id,
        'item_name', ql.item_name,
        'qty', ql.qty,
        'alias', COALESCE(ql.innovations_alias, pm.innovations_alias),
        'codes', CASE WHEN a.alias IS NOT NULL THEN jsonb_build_object(
          'material_code', a.material_code, 'material_description', a.material_description,
          'style_code', a.style_code, 'style_description', a.style_description,
          'color_code', a.color_code, 'color_description', a.color_description,
          'mf_type', a.mf_type
        ) END,
        'rx', (SELECT to_jsonb(r) - 'id' - 'created_at' - 'updated_at'
               FROM public.rx_details r WHERE r.quote_line_id = ql.id)
      ) ORDER BY ql.sort_order)
      FROM public.quote_lines ql
      LEFT JOIN public.lens_alias_map pm
        ON pm.lens_id = ql.product_id  -- quote_lines.product_id is already uuid
       AND pm.is_primary AND pm.confirmed_at IS NOT NULL
      LEFT JOIN public.innovations_lens_aliases a
        ON a.alias = COALESCE(ql.innovations_alias, pm.innovations_alias)
      WHERE ql.quote_id = p_quote_id AND ql.line_type = 'Lens'
    ), '[]'::jsonb),
    'addons', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'item_name', ql.item_name, 'sku', ql.sku, 'qty', ql.qty,
        'line_type', ql.line_type
      ) ORDER BY ql.sort_order)
      FROM public.quote_lines ql
      WHERE ql.quote_id = p_quote_id AND ql.line_type IN ('AddOn','Supply')
    ), '[]'::jsonb),
    'built_at', now()
  );
$$;

REVOKE ALL ON FUNCTION public.build_rx_submission_payload(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.build_rx_submission_payload(uuid) TO authenticated;

-- ── 3. Enqueue on payment/confirmation ──────────────────────────────────────
-- Fires when an order transitions INTO 'confirmed' (card path: settle_scotia_
-- payment sets this; on-account path: staff confirm the order). Any order
-- item carrying variant_metadata.rx_quote_id enqueues that quote once.

CREATE OR REPLACE FUNCTION public.enqueue_rx_submissions_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id uuid;
BEGIN
  IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    FOR v_quote_id IN
      SELECT DISTINCT (oi.variant_metadata ->> 'rx_quote_id')::uuid
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
        AND COALESCE(oi.variant_metadata ->> 'rx_quote_id', '') ~* '^[0-9a-f-]{36}$'
    LOOP
      INSERT INTO public.rx_order_submissions (quote_id, order_id, account_id, status, payload)
      SELECT v_quote_id, NEW.id, q.account_id, 'pending_review',
             public.build_rx_submission_payload(v_quote_id)
      FROM public.quotes q WHERE q.id = v_quote_id
      ON CONFLICT (quote_id) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enqueue_rx_submissions ON public.orders;
CREATE TRIGGER orders_enqueue_rx_submissions
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_rx_submissions_for_order();

-- ── 4. Staff release gate RPCs ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_rx_submission(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can approve Rx submissions.';
  END IF;
  UPDATE public.rx_order_submissions
  SET status = 'approved',
      -- refresh the snapshot at approval time so late fixes are included
      payload = public.build_rx_submission_payload(quote_id),
      approved_by = auth.uid(), approved_at = now(), last_error = NULL
  WHERE id = p_id AND status IN ('pending_review','failed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in an approvable state.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_rx_submission(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can cancel Rx submissions.';
  END IF;
  UPDATE public.rx_order_submissions
  SET status = 'cancelled'
  WHERE id = p_id AND status IN ('pending_review','approved','failed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in a cancellable state.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_rx_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_rx_submission(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_rx_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_rx_submission(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
