-- Fix 1: Enable RLS on material_upgrades table
ALTER TABLE public.material_upgrades ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated role user to read material_upgrades
CREATE POLICY "Role users can select material_upgrades"
  ON public.material_upgrades FOR SELECT
  USING (has_any_role(auth.uid()));

-- Allow editors to insert/update/delete
CREATE POLICY "Editors can insert material_upgrades"
  ON public.material_upgrades FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update material_upgrades"
  ON public.material_upgrades FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete material_upgrades"
  ON public.material_upgrades FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: The wholesale_inquiries INSERT WITH CHECK (true) is intentional (public submission form)
-- Mark it as acceptable - no change needed, it is a public contact form