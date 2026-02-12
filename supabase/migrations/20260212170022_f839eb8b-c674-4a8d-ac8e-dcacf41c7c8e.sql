
ALTER TABLE public.lenses ADD COLUMN show_in_pricelist boolean NOT NULL DEFAULT true;
ALTER TABLE public.lenses ADD COLUMN full_lab boolean NOT NULL DEFAULT false;
ALTER TABLE public.lenses ADD COLUMN show_in_ws_pricelist boolean NOT NULL DEFAULT false;
ALTER TABLE public.lenses ADD COLUMN show_on_website boolean NOT NULL DEFAULT false;
