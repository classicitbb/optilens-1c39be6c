-- Draft copy for published wiki pages.
--
-- Editing a published page used to mean either changing the live page on every keystroke or
-- keeping edits only in the browser. These nullable columns hold the unpublished edits; the
-- public site keeps reading title/body_json until "Update" promotes the draft and clears it.
-- Additive and nullable: existing rows and readers are unaffected, and the admin wiki falls back
-- to local-only edits for published pages until this has been applied.
ALTER TABLE public.help_articles
  ADD COLUMN IF NOT EXISTS draft_title text,
  ADD COLUMN IF NOT EXISTS draft_body_json jsonb,
  ADD COLUMN IF NOT EXISTS draft_saved_at timestamptz;

-- ── PostgREST schema cache ─────────────────────────────────────────────────
-- Without this the Data API keeps serving its cached schema and rejects the new columns
-- for up to ~10 minutes after the DDL has committed.
NOTIFY pgrst, 'reload schema';
