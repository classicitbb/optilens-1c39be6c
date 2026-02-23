
-- Help articles table (editable content for contextual help)
CREATE TABLE public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  page_slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select help_articles"
  ON public.help_articles FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert help_articles"
  ON public.help_articles FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update help_articles"
  ON public.help_articles FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete help_articles"
  ON public.help_articles FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Help feedback table
CREATE TABLE public.help_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.help_articles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'suggestion')),
  suggestion_text text,
  page_slug text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.help_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert help_feedback"
  ON public.help_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Editors can select help_feedback"
  ON public.help_feedback FOR SELECT
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Users can view own feedback"
  ON public.help_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at on help_articles
CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
