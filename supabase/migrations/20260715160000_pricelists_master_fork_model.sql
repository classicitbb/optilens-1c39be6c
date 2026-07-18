-- BS1-04: master pricelist + per-customer fork + variance tracking.
--
-- Deliberately NOT the same table as pricelist_versions (catalog document
-- STRUCTURE/layout — unchanged, one canonical row is a separate operational
-- decision, see docs/issues/BS1-04-master-and-fork-model.md task 0) and NOT
-- pricelist_overrides (version-scoped price exceptions shared by every
-- customer on that version). This is the sole customer-PRICE mechanism going
-- forward — see docs/PRICING_SCHEMA.md "Reconciliation with assigned_pricelist_id".

CREATE TABLE IF NOT EXISTS public.pricelists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('master', 'custom')),
  customer_id integer REFERENCES public.customers(id) ON DELETE CASCADE,
  name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricelists_kind_customer_check CHECK (
    (kind = 'master' AND customer_id IS NULL) OR
    (kind = 'custom' AND customer_id IS NOT NULL)
  )
);

-- Enforce exactly one active master (locked decision).
CREATE UNIQUE INDEX IF NOT EXISTS pricelists_single_master_idx
  ON public.pricelists ((1)) WHERE kind = 'master';

-- One custom fork per customer (the fork is a whole-account thing, not
-- multiple competing custom lists for the same customer).
CREATE UNIQUE INDEX IF NOT EXISTS pricelists_one_custom_per_customer_idx
  ON public.pricelists (customer_id) WHERE kind = 'custom';

-- Seed the single master row now; it starts empty (zero pricelist_lines)
-- until BS1-05's Auto Price populates it.
INSERT INTO public.pricelists (kind, name)
SELECT 'master', 'Master Pricelist'
WHERE NOT EXISTS (SELECT 1 FROM public.pricelists WHERE kind = 'master');

-- pricelist_lines: for the MASTER pricelist, a line IS that item's master
-- price. For a CUSTOM pricelist, a line is a delta from master — sparse by
-- design (only items actually negotiated get a row here; everything else
-- falls through to master via effective_price()). This is NOT
-- pricelist_overrides (that's version-scoped, shared across customers).
CREATE TABLE IF NOT EXISTS public.pricelist_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricelist_id uuid NOT NULL REFERENCES public.pricelists(id) ON DELETE CASCADE,
  item_ref uuid NOT NULL REFERENCES public.pricing_items(id) ON DELETE CASCADE,
  custom_price numeric NOT NULL CHECK (custom_price > 0),
  reason text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('price_match', 'manual', 'auto_price')),
  created_by uuid,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pricelist_id, item_ref)
);

ALTER TABLE public.pricelists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricelist_lines ENABLE ROW LEVEL SECURITY;

-- Staff-only direct table access. Customers never read these tables
-- directly — only through effective_price(), which returns just the
-- resolved number, not internal fields (reason/source/created_by/approved_by).
CREATE POLICY "Editors manage pricelists"
  ON public.pricelists FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Editors manage pricelist lines"
  ON public.pricelist_lines FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

-- ── Read path: THE function portal + Rx form call ───────────────────────
-- Self-or-staff gated: a portal customer may read only their own effective
-- prices (mapped via profiles.user_id -> profiles.crm_customer_id, the same
-- mapping sync_customer_portal_identity()/usePortalIdentity.ts already use).
CREATE OR REPLACE FUNCTION public.effective_price(p_customer_id integer, p_item_ref uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_price numeric;
BEGIN
  IF NOT (
    public.has_edit_role(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.user_id = auth.uid() AND pr.crm_customer_id = p_customer_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to read prices for this customer.';
  END IF;

  SELECT pl.custom_price INTO v_price
    FROM public.pricelist_lines pl
    JOIN public.pricelists p ON p.id = pl.pricelist_id
   WHERE p.kind = 'custom' AND p.customer_id = p_customer_id AND pl.item_ref = p_item_ref
   LIMIT 1;

  IF v_price IS NULL THEN
    SELECT pl.custom_price INTO v_price
      FROM public.pricelist_lines pl
      JOIN public.pricelists p ON p.id = pl.pricelist_id
     WHERE p.kind = 'master' AND pl.item_ref = p_item_ref
     LIMIT 1;
  END IF;

  RETURN v_price;
END;
$function$;

REVOKE ALL ON FUNCTION public.effective_price(integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effective_price(integer, uuid) TO authenticated;

-- ── Write paths (direct, editor-gated) ──────────────────────────────────
-- Named explicitly (set_master_price vs set_custom_price) so the caller
-- states its target rather than a generic UPDATE that could hit the wrong
-- pricelist_id by mistake — the "foolproof: impossible to accidentally
-- edit master while intending a customer change" requirement.
-- BS1-06 adds owner/manager approval gating on top of set_custom_price for
-- non-owner staff (price-match proposals); this is the base write path.

CREATE OR REPLACE FUNCTION public.set_master_price(p_item_ref uuid, p_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_master_id uuid;
  v_before jsonb;
  v_line_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can set prices.';
  END IF;

  SELECT id INTO v_master_id FROM public.pricelists WHERE kind = 'master';

  SELECT to_jsonb(pl), pl.id INTO v_before, v_line_id
    FROM public.pricelist_lines pl WHERE pl.pricelist_id = v_master_id AND pl.item_ref = p_item_ref;

  INSERT INTO public.pricelist_lines (pricelist_id, item_ref, custom_price, source, created_by)
  VALUES (v_master_id, p_item_ref, p_price, 'manual', auth.uid())
  ON CONFLICT (pricelist_id, item_ref)
  DO UPDATE SET custom_price = EXCLUDED.custom_price, updated_at = now()
  RETURNING id INTO v_line_id;

  INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
  SELECT auth.uid(), 'set_master_price', 'pricelist_lines', v_line_id::text, v_before, to_jsonb(pl)
  FROM public.pricelist_lines pl WHERE pl.id = v_line_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_custom_price(
  p_customer_id integer,
  p_item_ref uuid,
  p_price numeric,
  p_reason text DEFAULT NULL,
  p_source text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_id uuid;
  v_before jsonb;
  v_line_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can set prices.';
  END IF;

  -- Auto-fork on first custom write for this customer (locked decision:
  -- the moment ONE price changes for a customer, the account forks).
  INSERT INTO public.pricelists (kind, customer_id, created_by)
  VALUES ('custom', p_customer_id, auth.uid())
  ON CONFLICT (customer_id) WHERE kind = 'custom' DO NOTHING;

  SELECT id INTO v_pricelist_id FROM public.pricelists WHERE kind = 'custom' AND customer_id = p_customer_id;

  SELECT to_jsonb(pl), pl.id INTO v_before, v_line_id
    FROM public.pricelist_lines pl WHERE pl.pricelist_id = v_pricelist_id AND pl.item_ref = p_item_ref;

  INSERT INTO public.pricelist_lines (pricelist_id, item_ref, custom_price, reason, source, created_by)
  VALUES (v_pricelist_id, p_item_ref, p_price, p_reason, p_source, auth.uid())
  ON CONFLICT (pricelist_id, item_ref)
  DO UPDATE SET custom_price = EXCLUDED.custom_price, reason = EXCLUDED.reason, source = EXCLUDED.source, updated_at = now()
  RETURNING id INTO v_line_id;

  INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
  SELECT auth.uid(), 'set_custom_price', 'pricelist_lines', v_line_id::text, v_before, to_jsonb(pl)
  FROM public.pricelist_lines pl WHERE pl.id = v_line_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_master_price(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_master_price(uuid, numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.set_custom_price(integer, uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_custom_price(integer, uuid, numeric, text, text) TO authenticated;

-- ── Revert paths ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revert_line_to_master(p_customer_id integer, p_item_ref uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_id uuid;
  v_before jsonb;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can revert prices.';
  END IF;

  SELECT id INTO v_pricelist_id FROM public.pricelists WHERE kind = 'custom' AND customer_id = p_customer_id;
  IF v_pricelist_id IS NULL THEN
    RETURN; -- no fork exists, nothing to revert
  END IF;

  SELECT to_jsonb(pl) INTO v_before FROM public.pricelist_lines pl
   WHERE pl.pricelist_id = v_pricelist_id AND pl.item_ref = p_item_ref;

  DELETE FROM public.pricelist_lines WHERE pricelist_id = v_pricelist_id AND item_ref = p_item_ref;

  IF v_before IS NOT NULL THEN
    INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
    VALUES (auth.uid(), 'revert_line_to_master', 'pricelist_lines', (v_before ->> 'id'), v_before, NULL);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revert_account_to_master(p_customer_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_id uuid;
  v_before jsonb;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can revert prices.';
  END IF;

  SELECT id INTO v_pricelist_id FROM public.pricelists WHERE kind = 'custom' AND customer_id = p_customer_id;
  IF v_pricelist_id IS NULL THEN
    RETURN;
  END IF;

  SELECT jsonb_agg(to_jsonb(pl)) INTO v_before FROM public.pricelist_lines pl WHERE pl.pricelist_id = v_pricelist_id;

  DELETE FROM public.pricelist_lines WHERE pricelist_id = v_pricelist_id;
  -- Leave the (now-empty) custom pricelist row in place — effective_price
  -- already falls back to master when no line exists; an empty fork tracks
  -- master on every item until a new line is added.

  INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
  VALUES (auth.uid(), 'revert_account_to_master', 'pricelists', v_pricelist_id::text, v_before, NULL);
END;
$function$;

REVOKE ALL ON FUNCTION public.revert_line_to_master(integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revert_line_to_master(integer, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.revert_account_to_master(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revert_account_to_master(integer) TO authenticated;

-- ── Variance (computed, not stored) ─────────────────────────────────────
CREATE OR REPLACE VIEW public.pricelist_variance AS
SELECT
  cust.customer_id AS customer_id,
  cust_line.item_ref AS item_ref,
  master_line.custom_price AS master_price,
  cust_line.custom_price AS custom_price,
  (cust_line.custom_price - master_line.custom_price) AS delta,
  CASE WHEN master_line.custom_price > 0
    THEN round(((cust_line.custom_price - master_line.custom_price) / master_line.custom_price) * 100, 2)
    ELSE NULL END AS pct
FROM public.pricelists cust
JOIN public.pricelist_lines cust_line ON cust_line.pricelist_id = cust.id
JOIN public.pricelists master ON master.kind = 'master'
JOIN public.pricelist_lines master_line ON master_line.pricelist_id = master.id AND master_line.item_ref = cust_line.item_ref
WHERE cust.kind = 'custom';

GRANT SELECT ON public.pricelist_variance TO authenticated;

NOTIFY pgrst, 'reload schema';
