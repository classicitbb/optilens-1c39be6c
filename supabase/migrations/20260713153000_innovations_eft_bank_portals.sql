-- Keep the bank payment directory aligned with the read-only Innovations EFT
-- institution catalog. The ERP sends only its immutable id + exact display
-- name; sign-in URLs remain curated here so a source sync cannot overwrite a
-- verified banking destination.

ALTER TABLE public.bank_payment_portals
  ADD COLUMN IF NOT EXISTS innovations_eft_institution_id bigint,
  ALTER COLUMN portal_url DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bank_payment_portals_innovations_eft_institution_id_key
  ON public.bank_payment_portals (innovations_eft_institution_id);

-- Seed the exact source labels found in Innovations dbo.EFTInstitutions on
-- 2026-07-13. Unknown, non-retail, and placeholder records deliberately have
-- no URL: routing a customer to an unrelated bank is worse than prompting the
-- admin to complete a verified mapping.
INSERT INTO public.bank_payment_portals (
  bank_name,
  innovations_eft_institution_id,
  portal_url,
  notes,
  updated_at
)
VALUES
  (N'Bank of Nova Scotia', 1, N'https://www.online.scotiabank.com/leapsignon/leap/signOnApp/', N'Verified Scotia OnLine sign-in.', now()),
  (N'CBA BB', 7, NULL, N'Legacy Innovations abbreviation; verify the institution before assigning a sign-in URL.', now()),
  (N'Central Bank of Barbados', 10, NULL, N'Central-bank record; no retail customer online-banking sign-in URL is configured.', now()),
  (N'First Caribbean International ', 3, N'https://onlinebanking.cibccaribbean.com/', N'CIBC Caribbean Online Banking. Source name intentionally retains its trailing space.', now()),
  (N'First Citizens Bank', 6, N'https://www.firstcitizensgroup.com/bb/', N'First Citizens Barbados online-banking sign-in.', now()),
  (N'NATIONAL BANK LIMITED', 9, N'https://republicbarbados.com/personal/republiconline', N'Legacy National Bank label; routed to Republic Online. Verify with the customer if their institution has changed.', now()),
  (N'Not Sure', 8, NULL, N'Placeholder source value; do not redirect until a bank is confirmed.', now()),
  (N'Republic Bank', 5, N'https://republicbarbados.com/personal/republiconline', N'Republic Online sign-in.', now()),
  (N'Royal Bank of Canada', 2, N'https://caribbean.rbcroyalbank.com/', N'RBC Caribbean Online Banking sign-in.', now()),
  (N'Royal Bank of Trinidad & Tobag', 4, N'https://caribbean.rbcroyalbank.com/', N'Legacy RBTT label; routed to RBC Caribbean Online Banking.', now())
ON CONFLICT (bank_name) DO UPDATE SET
  innovations_eft_institution_id = EXCLUDED.innovations_eft_institution_id,
  portal_url = EXCLUDED.portal_url,
  notes = EXCLUDED.notes,
  updated_at = EXCLUDED.updated_at;

-- The sync receiver already sends statement_lines; add both it and the new
-- banks entity to the run-log allowlist so a real non-dry-run can be audited.
ALTER TABLE public.innovations_sync_runs
  DROP CONSTRAINT IF EXISTS innovations_sync_runs_entity_check;

ALTER TABLE public.innovations_sync_runs
  ADD CONSTRAINT innovations_sync_runs_entity_check
  CHECK (entity IN ('banks', 'customers', 'contacts', 'invoices', 'statements', 'statement_lines', 'balances'));
