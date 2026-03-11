-- Wiki rich editing workflow and canonical article model
ALTER TABLE public.help_articles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS section_id text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.help_articles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_json jsonb,
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1;

UPDATE public.help_articles
SET slug = COALESCE(slug, NULLIF(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), ''))
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_help_articles_slug_unique ON public.help_articles(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_help_articles_status ON public.help_articles(status);
CREATE INDEX IF NOT EXISTS idx_help_articles_parent_id ON public.help_articles(parent_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_section_id ON public.help_articles(section_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_search ON public.help_articles
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(summary, '')));

CREATE TABLE IF NOT EXISTS public.help_article_versions (
  version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  title_snapshot text NOT NULL,
  body_snapshot jsonb NOT NULL,
  saved_by uuid,
  saved_at timestamptz NOT NULL DEFAULT now(),
  change_note text,
  version_number integer NOT NULL
);

ALTER TABLE public.help_article_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select help_article_versions"
  ON public.help_article_versions FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert help_article_versions"
  ON public.help_article_versions FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete help_article_versions"
  ON public.help_article_versions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.help_article_versions (article_id, title_snapshot, body_snapshot, saved_by, change_note, version_number)
SELECT
  id,
  title,
  COALESCE(body_json, jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'children', jsonb_build_array(jsonb_build_object('type', 'text', 'text', coalesce(content, ''))))))),
  author_id,
  'Backfill baseline version',
  version_number
FROM public.help_articles
ON CONFLICT DO NOTHING;
