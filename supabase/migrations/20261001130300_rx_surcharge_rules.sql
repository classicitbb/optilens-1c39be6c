-- Rx order data model, Phase 0 (part 4): surcharges as data, not code.
--
-- Until now every Rx surcharge was a literal in the form engine's price()
-- (rx-order-engine.js "pricing"). They move here, seeded with exactly those
-- values, so staff can change them without a deploy and the server and client
-- price from the same rows. Values are BBD. Global for now; per-pricelist
-- overrides are an open decision.
--
-- basis:
--   flat           amount (charged once, or per eye when per_eye)
--   flat_plus_unit amount + unit_amount × measured value (prism: per diopter)
--   tiered         amount at threshold, tier2_amount at tier2_threshold
--   percent        amount % of the running subtotal
--   multiplier     multiplies every line (single-eye jobs)
CREATE TABLE IF NOT EXISTS public.rx_surcharge_rules (
  code            text PRIMARY KEY,
  label           text NOT NULL,
  detail          text,
  basis           text NOT NULL CHECK (basis IN ('flat', 'flat_plus_unit', 'tiered', 'percent', 'multiplier')),
  amount          numeric NOT NULL DEFAULT 0,
  unit_amount     numeric NOT NULL DEFAULT 0,
  threshold       numeric,
  tier2_threshold numeric,
  tier2_amount    numeric,
  per_eye         boolean NOT NULL DEFAULT false,
  active          boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid
);

ALTER TABLE public.rx_surcharge_rules ENABLE ROW LEVEL SECURITY;

-- The form prices client-side from these rows, so any signed-in user may read
-- them; only editors may change them.
DROP POLICY IF EXISTS "Signed-in users read rx surcharge rules" ON public.rx_surcharge_rules;
CREATE POLICY "Signed-in users read rx surcharge rules"
  ON public.rx_surcharge_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Editors manage rx surcharge rules" ON public.rx_surcharge_rules;
CREATE POLICY "Editors manage rx surcharge rules"
  ON public.rx_surcharge_rules FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP TRIGGER IF EXISTS update_rx_surcharge_rules_updated_at ON public.rx_surcharge_rules;
CREATE TRIGGER update_rx_surcharge_rules_updated_at
  BEFORE UPDATE ON public.rx_surcharge_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rx_surcharge_rules
  (code, label, detail, basis, amount, unit_amount, threshold, tier2_threshold, tier2_amount, per_eye, sort_order)
VALUES
  ('prism',            'Prism',                   'Ground in; base + per diopter of the larger eye', 'flat_plus_unit', 16, 4, 0,  NULL, NULL, false, 10),
  ('oversize_blank',   'Oversize blank',          'Diameter 75 mm and over; larger at 80 mm',        'tiered',         22, 0, 75, 80,   32,   true,  20),
  ('high_power',       'High-power surfacing',    'Sphere beyond ±6.00',                             'flat',           18, 0, 6,  NULL, NULL, false, 30),
  ('glazing_standard', 'Glazing & mounting',      'Plastic / metal frames',                          'flat',           17, 0, NULL, NULL, NULL, false, 40),
  ('glazing_grooved',  'Glazing & mounting',      'Grooved / nylon',                                 'flat',           31, 0, NULL, NULL, NULL, false, 41),
  ('glazing_rimless',  'Glazing & mounting',      'Rimless drill mount',                             'flat',           42, 0, NULL, NULL, NULL, false, 42),
  ('remote_edge',      'Remote edge to trace',    'Added to the mount''s glazing charge',            'flat',            6, 0, NULL, NULL, NULL, false, 50),
  ('tint_match',       'Tint match',              'Per tint, shared across both eyes',               'flat',            9, 0, NULL, NULL, NULL, true,  60),
  ('priority_service', 'Priority service',        '3 working days; % of the subtotal',               'percent',        15, 0, NULL, NULL, NULL, false, 70),
  ('single_eye',       'Single-eye factor',       'One-eye jobs are charged this share of the pair', 'multiplier',    0.55, 0, NULL, NULL, NULL, false, 80)
ON CONFLICT (code) DO NOTHING;
