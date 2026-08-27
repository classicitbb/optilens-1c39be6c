-- Portal Copilot → Doc Studio authoring.
--
-- Three changes, all in service of letting the copilot produce a complete
-- billing document without a human re-entering fields the ERP already knows:
--
--   1. company_settings gains the issuer block (registration numbers, bank
--      details, document defaults). These lived only in the Doc Studio
--      browser's localStorage, so they were per-browser and invisible to any
--      server-side caller — every copilot draft would have arrived with a
--      blank letterhead and payment block.
--   2. docstudio_billing_documents gains provenance columns and a real status
--      lifecycle, so an AI draft is identifiable and traceable to its source.
--   3. A server-side billing number sequence replaces the studio's
--      localStorage counter, which reset to 1 in every browser.

-- ---------------------------------------------------------------- 1. issuer
-- Everything else the letterhead needs already exists here: company_name,
-- slogan, tax_tin, tel, fax, email, base_currency, default_vat, and the
-- physical_* address parts.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS company_reg_no      text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_name           text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_name   text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_no     text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_branch         text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_swift          text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_note           text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_paper_size  text    NOT NULL DEFAULT 'letter',
  ADD COLUMN IF NOT EXISTS default_due_days    integer NOT NULL DEFAULT 30;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'company_settings' AND constraint_name = 'company_settings_paper_size_check'
  ) THEN
    ALTER TABLE public.company_settings
      ADD CONSTRAINT company_settings_paper_size_check CHECK (default_paper_size IN ('letter','a4'));
  END IF;
END $$;

-- Seed from the values Doc Studio has been hard-defaulting in the browser
-- (studio-logic.js:77-79, :1356-1357) so nothing changes visually on day one.
UPDATE public.company_settings
   SET bank_name         = COALESCE(NULLIF(bank_name, ''), 'Bank of Nova Scotia'),
       bank_account_name = COALESCE(NULLIF(bank_account_name, ''), 'Classic Visions');

-- ----------------------------------------------------------- 2. provenance
ALTER TABLE public.docstudio_billing_documents
  ADD COLUMN IF NOT EXISTS source_document_type text    NULL,
  ADD COLUMN IF NOT EXISTS source_document_id   uuid    NULL,
  ADD COLUMN IF NOT EXISTS created_by_copilot   boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.docstudio_billing_documents.source_document_type IS
  'Origin of a converted document: docstudio_billing_document | quote | order.';

-- Normalise before constraining: the column had no CHECK, and the studio never
-- wrote it, so everything should already be ''saved'' — but do not assume.
UPDATE public.docstudio_billing_documents
   SET status = 'saved'
 WHERE status IS NULL OR status NOT IN ('draft','saved','sent');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'docstudio_billing_documents'
      AND constraint_name = 'docstudio_billing_documents_status_check'
  ) THEN
    ALTER TABLE public.docstudio_billing_documents
      ADD CONSTRAINT docstudio_billing_documents_status_check
      CHECK (status IN ('draft','saved','sent'));
  END IF;
END $$;

-- Makes conversion idempotent: asking twice for "a proforma from QTE-0010"
-- returns the existing draft instead of creating a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS docstudio_billing_source_unique
  ON public.docstudio_billing_documents (source_document_type, source_document_id)
  WHERE created_by_copilot AND deleted_at IS NULL AND source_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS docstudio_billing_status_idx
  ON public.docstudio_billing_documents (status) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------- 3. numbering
CREATE TABLE IF NOT EXISTS public.docstudio_billing_sequences (
  document_type text PRIMARY KEY CHECK (document_type IN ('invoice','quote','proforma','receipt')),
  next_value    integer NOT NULL DEFAULT 1 CHECK (next_value > 0),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.docstudio_billing_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role users can select docstudio billing sequences" ON public.docstudio_billing_sequences;
CREATE POLICY "Role users can select docstudio billing sequences"
  ON public.docstudio_billing_sequences FOR SELECT USING (has_any_role(auth.uid()));

-- Seed each type past the highest number already issued, so adopting the
-- sequence can never reissue a number a customer has already seen.
INSERT INTO public.docstudio_billing_sequences (document_type, next_value)
SELECT t.document_type,
       COALESCE(MAX((regexp_match(d.billing_number, '^[A-Z]{3}-(\d+)$'))[1]::int), 0) + 1
  FROM (VALUES ('invoice'),('quote'),('proforma'),('receipt')) AS t(document_type)
  LEFT JOIN public.docstudio_billing_documents d
         ON d.document_type = t.document_type
        AND d.billing_number ~ '^[A-Z]{3}-\d+$'
 GROUP BY t.document_type
ON CONFLICT (document_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_billing_number(p_document_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_value  integer;
BEGIN
  IF NOT has_edit_role(auth.uid()) AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Not authorized to issue billing numbers';
  END IF;

  v_prefix := CASE p_document_type
                WHEN 'invoice'  THEN 'INV'
                WHEN 'quote'    THEN 'QTE'
                WHEN 'proforma' THEN 'PRF'
                WHEN 'receipt'  THEN 'RCT'
              END;
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Unknown billing document type: %', p_document_type;
  END IF;

  -- UPDATE ... RETURNING takes a row lock, so concurrent callers serialise
  -- here rather than racing for the same number.
  UPDATE public.docstudio_billing_sequences
     SET next_value = next_value + 1,
         updated_at = now()
   WHERE document_type = p_document_type
  RETURNING next_value - 1 INTO v_value;

  IF v_value IS NULL THEN
    INSERT INTO public.docstudio_billing_sequences (document_type, next_value)
    VALUES (p_document_type, 2)
    RETURNING next_value - 1 INTO v_value;
  END IF;

  RETURN v_prefix || '-' || lpad(v_value::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_billing_number(text) TO authenticated;

-- ------------------------------------------------- 4. governed document send
-- Sending a finished document to a customer is the one Doc Studio action that
-- leaves the building, so unlike the drafting writes it does NOT execute
-- immediately: it becomes a copilot_actions row the admin approves. This is
-- the send_portal_invite mechanism, which already works end to end, applied to
-- a second action type.
INSERT INTO public.copilot_workflow_settings (
  workflow, email_template_key, email_template_name, email_subject_pattern
) VALUES (
  'docstudio_send',
  'builtin:docstudio-document-v1',
  'Doc Studio Document v1',
  '{{document_type}} {{billing_number}} from Classic Visions'
) ON CONFLICT (workflow) DO NOTHING;

ALTER TABLE public.copilot_actions DROP CONSTRAINT IF EXISTS copilot_actions_action_type_check;
ALTER TABLE public.copilot_actions
  ADD CONSTRAINT copilot_actions_action_type_check
  CHECK (action_type IN ('send_portal_invite', 'create_followup_task', 'send_docstudio_email'));
