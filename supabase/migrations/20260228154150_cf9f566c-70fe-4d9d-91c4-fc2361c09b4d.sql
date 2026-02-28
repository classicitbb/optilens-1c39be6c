
CREATE TABLE public.wiki_headings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wiki_headings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select wiki_headings"
  ON public.wiki_headings FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert wiki_headings"
  ON public.wiki_headings FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update wiki_headings"
  ON public.wiki_headings FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete wiki_headings"
  ON public.wiki_headings FOR DELETE
  USING (has_edit_role(auth.uid()));
