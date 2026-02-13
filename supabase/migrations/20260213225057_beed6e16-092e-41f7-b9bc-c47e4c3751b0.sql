
ALTER TABLE public.lenses
ADD COLUMN finishtype_id uuid REFERENCES public.finishtypes(id);
