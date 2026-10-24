-- Rich contact notes: the Atlas editor document. `notes` stays as the plain-text
-- mirror that search, Copilot and outreach drafting read. No backfill: contacts
-- with a null notes_doc keep showing their existing plain-text notes.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS notes_doc jsonb;

COMMENT ON COLUMN public.contacts.notes_doc IS
  'Canonical Atlas document ({blocks:[...]}) for the contact notes. notes holds its plain-text mirror.';
