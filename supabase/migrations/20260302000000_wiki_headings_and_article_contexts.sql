-- Persist wiki headings and support multi-context article mapping
CREATE TABLE IF NOT EXISTS public.wiki_headings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE POLICY "Admins can delete wiki_headings"
  ON public.wiki_headings FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_wiki_headings_updated_at
  BEFORE UPDATE ON public.wiki_headings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.help_article_contexts (
  article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  context_slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, context_slug)
);

ALTER TABLE public.help_article_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select help_article_contexts"
  ON public.help_article_contexts FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert help_article_contexts"
  ON public.help_article_contexts FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update help_article_contexts"
  ON public.help_article_contexts FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete help_article_contexts"
  ON public.help_article_contexts FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.help_article_contexts (article_id, context_slug)
SELECT id, page_slug
FROM public.help_articles
ON CONFLICT (article_id, context_slug) DO NOTHING;
