ALTER TABLE public.addons
  ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;