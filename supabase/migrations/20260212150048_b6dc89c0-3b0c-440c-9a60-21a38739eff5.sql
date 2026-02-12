
-- Create lenses table
CREATE TABLE public.lenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  material_id uuid NOT NULL REFERENCES public.materials(id),
  mftype_id uuid NOT NULL REFERENCES public.mftypes(id),
  lenstype_id uuid NOT NULL REFERENCES public.lenstypes(id),
  name text NOT NULL,
  index_value numeric(3,2) NOT NULL,
  base_price numeric(10,2) NOT NULL,
  sell_price numeric(10,2) NOT NULL,
  sph_min numeric(5,2) NOT NULL,
  sph_max numeric(5,2) NOT NULL,
  cyl_min numeric(5,2) NOT NULL,
  cyl_max numeric(5,2) NOT NULL,
  add_min numeric(5,2),
  add_max numeric(5,2),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create junction table
CREATE TABLE public.lens_lens_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_id uuid NOT NULL REFERENCES public.lenses(id) ON DELETE CASCADE,
  lens_option_id uuid NOT NULL REFERENCES public.lens_options(id),
  extra_cost numeric(10,2) NOT NULL DEFAULT 0,
  UNIQUE (lens_id, lens_option_id)
);

-- Enable RLS
ALTER TABLE public.lenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lens_lens_options ENABLE ROW LEVEL SECURITY;

-- Lenses RLS policies
CREATE POLICY "Role users can select lenses"
  ON public.lenses FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert lenses"
  ON public.lenses FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update lenses"
  ON public.lenses FOR UPDATE
  USING (has_edit_role(auth.uid()));

-- lens_lens_options RLS policies
CREATE POLICY "Role users can select lens_lens_options"
  ON public.lens_lens_options FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert lens_lens_options"
  ON public.lens_lens_options FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update lens_lens_options"
  ON public.lens_lens_options FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete lens_lens_options"
  ON public.lens_lens_options FOR DELETE
  USING (has_edit_role(auth.uid()));

-- Trigger for updated_at on lenses
CREATE TRIGGER update_lenses_updated_at
  BEFORE UPDATE ON public.lenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
