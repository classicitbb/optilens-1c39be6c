-- Catalog pages table
CREATE TABLE public.catalog_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_template_id integer NOT NULL REFERENCES public.catalog_templates(id) ON DELETE CASCADE,
  page_number integer NOT NULL DEFAULT 1,
  page_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalog_template_id, page_number)
);

ALTER TABLE public.catalog_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read catalog pages"
  ON public.catalog_pages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can manage catalog pages"
  ON public.catalog_pages FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

-- Catalog page objects table
CREATE TABLE public.catalog_page_objects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.catalog_pages(id) ON DELETE CASCADE,
  object_type text NOT NULL DEFAULT 'text',
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 200,
  height numeric,
  rotation numeric NOT NULL DEFAULT 0,
  z_index integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_page_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read catalog page objects"
  ON public.catalog_page_objects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can manage catalog page objects"
  ON public.catalog_page_objects FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

-- Add status column to catalog_templates for publish workflow
ALTER TABLE public.catalog_templates ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- Triggers for updated_at
CREATE TRIGGER update_catalog_pages_updated_at
  BEFORE UPDATE ON public.catalog_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catalog_page_objects_updated_at
  BEFORE UPDATE ON public.catalog_page_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();