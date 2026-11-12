-- Atlas: every page in a space is a doc; a doc can be marked as a wiki page (knowledge for people
-- and AI) or an SOP (a procedure for people or AI to follow). Nullable: an unset type reads as "doc",
-- so existing rows need no backfill and nothing changes for them. Access is unchanged (no policy edits).
ALTER TABLE public.help_articles ADD COLUMN IF NOT EXISTS doc_type text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_articles_doc_type_check') THEN
    ALTER TABLE public.help_articles
      ADD CONSTRAINT help_articles_doc_type_check CHECK (doc_type IS NULL OR doc_type IN ('doc', 'wiki', 'sop'));
  END IF;
END $$;

COMMENT ON COLUMN public.help_articles.doc_type IS 'Atlas doc type: doc (default when null), wiki or sop.';

NOTIFY pgrst, 'reload schema';
