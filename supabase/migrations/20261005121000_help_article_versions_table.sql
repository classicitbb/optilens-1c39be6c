-- Version history for wiki pages, without the data rewrites in 20260308193000.
--
-- 20260308193000_wiki_rich_editor_workflow.sql was never applied to the hosted project, so
-- public.help_article_versions does not exist there and every wiki Publish / Update could not
-- record a version. Running that file as written would also:
--   * set a slug on every article that has none (39 of 51 at the time of writing). Those pages are
--     addressed today by a title+id fallback, so this would change their URLs, and two articles with
--     the same title would collide on the unique slug index and abort the migration;
--   * write a "baseline" version for every article from raw `content`, because none has body_json yet.
-- This migration creates only the structure that file intended: the table, its row-level security and
-- the indexes. It is idempotent, so environments that did run the original are unaffected.

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

DROP POLICY IF EXISTS "Role users can select help_article_versions" ON public.help_article_versions;
CREATE POLICY "Role users can select help_article_versions"
  ON public.help_article_versions FOR SELECT
  USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Editors can insert help_article_versions" ON public.help_article_versions;
CREATE POLICY "Editors can insert help_article_versions"
  ON public.help_article_versions FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete help_article_versions" ON public.help_article_versions;
CREATE POLICY "Admins can delete help_article_versions"
  ON public.help_article_versions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ── PostgREST schema cache ─────────────────────────────────────────────────
-- Without this the Data API keeps answering "Could not find the table ... in the schema cache"
-- for up to ~10 minutes after the DDL has committed.
NOTIFY pgrst, 'reload schema';
