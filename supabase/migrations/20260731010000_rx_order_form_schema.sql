-- Rx Order Form build, step 2: schema for the new wizard.
-- Three independent pieces — safe to run together, none blocks the others.
--
-- 1. quotes.account_id: was TEXT with no FK (dormant, never written by any
--    UI — confirmed 2026-07-31). Converting to a real INTEGER FK to
--    customers(id) so the new account picker has real referential
--    integrity instead of a free-text field.
-- 2. addon_clash_rules: net new. No incompatibility-rule data exists
--    anywhere today — this seeds the table structure only; the actual
--    clash pairs get inserted separately once the addons.category retag
--    (build order step 5) has happened, so the seed can reference real ids.
-- 3. quote_frame_details + quote_lines assistance flag: net new columns to
--    stop stuffing frame data into notes_internal as a `[[FRAME:{...}]]`
--    JSON blob, and to persist the "request assistance" flag past a save
--    (today it's prototype-only, in-memory).

-- ── 1. quotes.account_id: TEXT -> INTEGER FK ────────────────────────────────
--
-- First attempt at this failed: `quotes_customer` (the customer-portal quote
-- read view, /profile/quotes) has a rule depending on quotes.account_id, and
-- Postgres won't retype a column a view depends on. Fix: drop the view, do
-- the retype, recreate the view + its grants exactly as they were (copied
-- verbatim from 20260717003803_datamation_restore_portal_quote_customer_views.sql
-- and the follow-up grant-tightening in 20260717003919). quote_lines_customer
-- doesn't select account_id, so it isn't affected and is left alone.

DROP VIEW IF EXISTS public.quotes_customer;

-- Defensive: null out anything that isn't a valid integer before changing
-- the column type, so this can't fail on unexpected legacy junk. Given the
-- column is confirmed dormant (never written by RxQuoteWizard.tsx,
-- QuoteEditorPage.tsx, or useQuotes.ts), this should be a no-op in practice.
UPDATE public.quotes
SET account_id = NULL
WHERE account_id IS NOT NULL AND account_id !~ '^\d+$';

ALTER TABLE public.quotes
  ALTER COLUMN account_id TYPE integer USING NULLIF(account_id, '')::integer;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- Recreate quotes_customer exactly as it was (same columns, same
-- security_invoker + portal-feature-gate WHERE clause) — only the
-- underlying account_id column type changed, not the view's shape.
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
  updated_at
FROM public.quotes
WHERE created_by = auth.uid()
  AND public.can_access_customer_portal_feature(auth.uid(), 'quotes');

-- Re-apply the same grant tightening 20260717003919 did — CREATE OR REPLACE
-- VIEW resets privileges to Supabase's broader defaults, so this has to be
-- redone every time the view is recreated, same as last time.
REVOKE ALL ON public.quotes_customer FROM PUBLIC;
REVOKE ALL ON public.quotes_customer FROM anon;
REVOKE ALL ON public.quotes_customer FROM authenticated;
REVOKE ALL ON public.quotes_customer FROM service_role;
GRANT SELECT ON public.quotes_customer TO authenticated;
GRANT SELECT ON public.quotes_customer TO service_role;

-- ── 2. addon_clash_rules ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.addon_clash_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id_a uuid NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  addon_id_b uuid NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT addon_clash_rules_no_self_clash CHECK (addon_id_a <> addon_id_b)
);

-- Unordered-pair uniqueness: (A,B) and (B,A) count as the same rule, so
-- staff can't accidentally create a duplicate in reverse order.
CREATE UNIQUE INDEX IF NOT EXISTS addon_clash_rules_unordered_pair_idx
  ON public.addon_clash_rules (LEAST(addon_id_a, addon_id_b), GREATEST(addon_id_a, addon_id_b));

ALTER TABLE public.addon_clash_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select addon_clash_rules"
  ON public.addon_clash_rules FOR SELECT
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Editors can insert addon_clash_rules"
  ON public.addon_clash_rules FOR INSERT
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Editors can update addon_clash_rules"
  ON public.addon_clash_rules FOR UPDATE
  USING (public.has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete addon_clash_rules"
  ON public.addon_clash_rules FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── 3a. quote_frame_details (one row per quote — a job is one pair) ────────

CREATE TABLE IF NOT EXISTS public.quote_frame_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.quotes(id) ON DELETE CASCADE,
  job_scope text NOT NULL DEFAULT 'full_glaze' CHECK (job_scope IN ('surface_only', 'full_glaze')),
  brand text,
  model_colour text,
  bridge_mm numeric,
  a_mm numeric,
  b_mm numeric,
  ed_mm numeric,
  dbl_mm numeric,
  is_uncut boolean NOT NULL DEFAULT false,
  uncut_price numeric,
  shape_source_file text,
  shape_traced_ed numeric,
  shape_traced_axis numeric,
  standard_shape_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_frame_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select quote_frame_details"
  ON public.quote_frame_details FOR SELECT
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Editors can insert quote_frame_details"
  ON public.quote_frame_details FOR INSERT
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Editors can update quote_frame_details"
  ON public.quote_frame_details FOR UPDATE
  USING (public.has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete quote_frame_details"
  ON public.quote_frame_details FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_quote_frame_details_updated_at
  BEFORE UPDATE ON public.quote_frame_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 3b. "request assistance" flag on quote_lines ────────────────────────────

ALTER TABLE public.quote_lines
  ADD COLUMN IF NOT EXISTS needs_assistance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assistance_note text;

NOTIFY pgrst, 'reload schema';
