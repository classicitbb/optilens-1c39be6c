
ALTER TABLE public.suppliers ADD COLUMN abbrev text DEFAULT '' NOT NULL, ADD COLUMN code text DEFAULT '' NOT NULL;
ALTER TABLE public.brands ADD COLUMN abbrev text DEFAULT '' NOT NULL, ADD COLUMN code text DEFAULT '' NOT NULL;
ALTER TABLE public.materials ADD COLUMN abbrev text DEFAULT '' NOT NULL, ADD COLUMN code text DEFAULT '' NOT NULL;
ALTER TABLE public.mftypes ADD COLUMN abbrev text DEFAULT '' NOT NULL, ADD COLUMN code text DEFAULT '' NOT NULL;
ALTER TABLE public.lenstypes ADD COLUMN abbrev text DEFAULT '' NOT NULL, ADD COLUMN code text DEFAULT '' NOT NULL;
ALTER TABLE public.lens_options ADD COLUMN abbrev text DEFAULT '' NOT NULL, ADD COLUMN code text DEFAULT '' NOT NULL;
ALTER TABLE public.finishtypes ADD COLUMN abbrev text DEFAULT '' NOT NULL, ADD COLUMN code text DEFAULT '' NOT NULL;
