-- The initial receiver held only the display dimensions. Keep the exact
-- Innovations stock-lens dimensions so the Store Variants wizard can narrow a
-- range before it reads its power rows. Fin_Semi has more than two source
-- codes, so retain it as supplied rather than guessing a finished/semi label.
ALTER TABLE public.innovations_store_lenses
  ADD COLUMN IF NOT EXISTS material_group text,
  ADD COLUMN IF NOT EXISTS manufacturer text;

ALTER TABLE public.innovations_store_lenses
  DROP CONSTRAINT IF EXISTS innovations_store_lenses_lens_state_check;
ALTER TABLE public.innovations_store_lenses
  ADD CONSTRAINT innovations_store_lenses_lens_state_check
  CHECK (lens_state IN ('semi_finished', 'finished', 'stock_lens'));

CREATE INDEX IF NOT EXISTS innovations_store_lenses_configurator_idx
  ON public.innovations_store_lenses
  (is_enabled, material_group, material, mf_type, lens_type, option_name, manufacturer, finish_type);

NOTIFY pgrst, 'reload schema';
