-- Rx form (Phase 1b): lens advice thresholds and a real "popular coating" flag.
--
-- rx_lens_advice_rules — the thresholds behind the non-blocking tips on the lens
-- card (high power → higher index, rimless → impact-resistant material, thick edge,
-- thinning add-on). Read by the form, edited by staff. `params` is rule-specific;
-- the seeded values match DEFAULT_ADVICE_RULES in domain/advice.ts.
--
-- addons.is_popular — replaces the name regex the form used to decide which
-- coatings to show first.

CREATE TABLE IF NOT EXISTS public.rx_lens_advice_rules (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  detail      text,
  params      jsonb NOT NULL DEFAULT '{}'::jsonb,
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

ALTER TABLE public.rx_lens_advice_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users read rx lens advice rules" ON public.rx_lens_advice_rules;
CREATE POLICY "Signed-in users read rx lens advice rules"
  ON public.rx_lens_advice_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Editors manage rx lens advice rules" ON public.rx_lens_advice_rules;
CREATE POLICY "Editors manage rx lens advice rules"
  ON public.rx_lens_advice_rules FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP TRIGGER IF EXISTS update_rx_lens_advice_rules_updated_at ON public.rx_lens_advice_rules;
CREATE TRIGGER update_rx_lens_advice_rules_updated_at
  BEFORE UPDATE ON public.rx_lens_advice_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rx_lens_advice_rules (code, label, detail, params, sort_order) VALUES
  ('high_power_index',   'High power → higher index',   'Suggest a thinner material when the power is high',
     '{"min_sph": 6, "min_cyl": 4, "min_index": 1.6}', 10),
  ('rimless_impact',     'Rimless / grooved → impact-resistant', 'Suggest polycarbonate or Trivex for drilled and grooved mounts',
     '{"mounts": ["rimless", "grooved"], "safe_materials": "polycarbonate|poly|trivex|1\.5[3-9]"}', 20),
  ('large_ed_thickness', 'Large ED with strong power',  'Warn that the edge will be thick',
     '{"min_ed": 65, "min_sph": 4}', 30),
  ('thinning_addon',     'High power → thinning add-on', 'Suggest the thinning treatment when the power is high',
     '{"min_sph": 6, "min_cyl": 4, "treatment_match": "thinning"}', 40)
ON CONFLICT (code) DO NOTHING;

-- ── popular coatings ────────────────────────────────────────────────────────
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- seed from what the form used to match by name, so nothing changes on day one
UPDATE public.addons SET is_popular = true
WHERE is_popular = false AND name ~* '(blue\s*defen[cs]e|super\s*ar)';
