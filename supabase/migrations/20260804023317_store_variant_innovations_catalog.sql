-- Lens Local publishes the stock-lens configurator data here. Website Visible
-- and WSPL are deliberately absent: eligibility is enabled + semi/finished.
CREATE TABLE public.innovations_store_lenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innovations_lens_id text NOT NULL UNIQUE,
  name text NOT NULL,
  lens_state text NOT NULL CHECK (lens_state IN ('semi_finished', 'finished')),
  material text, lens_type text, option_name text, mf_type text, finish_type text,
  is_enabled boolean NOT NULL DEFAULT true,
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX innovations_store_lenses_picker_idx ON public.innovations_store_lenses (is_enabled, lens_state, name);

CREATE TABLE public.innovations_store_lens_power_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innovations_power_row_id text NOT NULL UNIQUE,
  innovations_lens_id text NOT NULL REFERENCES public.innovations_store_lenses(innovations_lens_id) ON DELETE CASCADE,
  diameter numeric, sphere numeric, base numeric, cylinder numeric, add numeric,
  stock_on_hand integer NOT NULL DEFAULT 0, right_opc text, left_opc text,
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX innovations_store_lens_power_rows_lens_idx ON public.innovations_store_lens_power_rows (innovations_lens_id);

ALTER TABLE public.innovations_store_lenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innovations_store_lens_power_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read Innovations store lenses" ON public.innovations_store_lenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Staff can read Innovations store lens powers" ON public.innovations_store_lens_power_rows FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.innovations_store_lenses, public.innovations_store_lens_power_rows FROM anon;
GRANT SELECT ON public.innovations_store_lenses, public.innovations_store_lens_power_rows TO authenticated;
GRANT ALL ON public.innovations_store_lenses, public.innovations_store_lens_power_rows TO service_role;

ALTER TABLE public.innovations_sync_runs DROP CONSTRAINT IF EXISTS innovations_sync_runs_entity_check;
ALTER TABLE public.innovations_sync_runs ADD CONSTRAINT innovations_sync_runs_entity_check CHECK (entity IN (
  'banks', 'customers', 'contacts', 'invoices', 'statements', 'statement_lines',
  'balances', 'order_activity', 'lens_aliases', 'supplies', 'store_lenses', 'store_lens_power_rows'
));
NOTIFY pgrst, 'reload schema';
