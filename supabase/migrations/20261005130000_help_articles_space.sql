-- Atlas: which space a page belongs to.
--
-- Nullable on purpose. Reads fall back to the same derivation (content_type), so nothing breaks if
-- the column is missing or a row is left NULL. The SOPs view is a published-only filter over the
-- wiki space and is never stored. No slug or URL is touched.

ALTER TABLE public.help_articles ADD COLUMN IF NOT EXISTS space text;

UPDATE public.help_articles
SET space = CASE
  WHEN content_type = 'wiki' AND visibility = 'internal' THEN 'wiki'
  WHEN content_type IN ('knowledge', 'faq', 'legal') THEN 'website'
END
WHERE space IS NULL;

CREATE INDEX IF NOT EXISTS idx_help_articles_space ON public.help_articles (space);

NOTIFY pgrst, 'reload schema';
