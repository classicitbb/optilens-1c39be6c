-- Atlas: a section can sit inside another section (subsections). Nullable: an unset parent is a
-- top-level section, so existing rows need no backfill and nothing changes for them. If the parent
-- row is ever hard-deleted the subsection returns to the top level. Access is unchanged (no policy edits).
ALTER TABLE public.wiki_headings
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.wiki_headings(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wiki_headings_not_own_parent') THEN
    ALTER TABLE public.wiki_headings
      ADD CONSTRAINT wiki_headings_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wiki_headings_parent_id_idx ON public.wiki_headings (parent_id);

COMMENT ON COLUMN public.wiki_headings.parent_id IS 'Atlas: the section this section sits inside (null at the top level).';

NOTIFY pgrst, 'reload schema';
