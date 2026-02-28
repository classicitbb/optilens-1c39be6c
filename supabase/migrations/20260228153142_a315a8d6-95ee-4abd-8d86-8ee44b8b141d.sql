
CREATE TABLE public.help_article_contexts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  context_slug text NOT NULL,
  UNIQUE(article_id, context_slug)
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

CREATE POLICY "Editors can delete help_article_contexts"
  ON public.help_article_contexts FOR DELETE
  USING (has_edit_role(auth.uid()));
