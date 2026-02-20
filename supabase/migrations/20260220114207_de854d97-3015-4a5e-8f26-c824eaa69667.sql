
-- Create table to persist version-specific pricelist catalog rows
CREATE TABLE IF NOT EXISTS public.pricelist_catalog_rows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pricelist_version_id integer NOT NULL REFERENCES public.pricelist_versions(id) ON DELETE CASCADE,
  catalog_type text NOT NULL DEFAULT 'rx', -- 'rx', 'stock', 'buysell'
  row_key text NOT NULL,
  row_type text NOT NULL, -- 'lens', 'addon', 'supply'
  section text NOT NULL,
  display_description text NOT NULL DEFAULT '',
  bbd_price numeric,
  item_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pricelist_version_id, catalog_type, row_key)
);

ALTER TABLE public.pricelist_catalog_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select pricelist_catalog_rows"
ON public.pricelist_catalog_rows FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert pricelist_catalog_rows"
ON public.pricelist_catalog_rows FOR INSERT
WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_catalog_rows"
ON public.pricelist_catalog_rows FOR UPDATE
USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete pricelist_catalog_rows"
ON public.pricelist_catalog_rows FOR DELETE
USING (has_edit_role(auth.uid()));
