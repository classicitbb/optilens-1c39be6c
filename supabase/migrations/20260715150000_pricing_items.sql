-- BS1-05: pricing_items — the natural item reference every pricing table keys
-- off (pricelist_lines, price_change_proposals, pricelist_drift, later issues).
--
-- Deliberately NOT a view/FK join onto rx_price_categories/lenses: the combo
-- key (treatment||tier||material) is classified by parsing lenses.name text
-- plus a hand-curated tier map (src/lib/pricing/classifier.ts, ported from
-- lens-classifier.js) — that logic lives in TypeScript, not SQL. This table
-- is populated at runtime by src/lib/pricing/combos.ts as it discovers
-- distinct combos, not hand-seeded or SQL-derived.
-- See docs/PRICING_SCHEMA.md "pricing_items combo key — RESOLVED".

CREATE TABLE IF NOT EXISTS public.pricing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment text NOT NULL,
  tier text NOT NULL,
  material text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (treatment, tier, material)
);

ALTER TABLE public.pricing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pricing items"
  ON public.pricing_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can upsert pricing items"
  ON public.pricing_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricing items"
  ON public.pricing_items FOR UPDATE
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

NOTIFY pgrst, 'reload schema';
