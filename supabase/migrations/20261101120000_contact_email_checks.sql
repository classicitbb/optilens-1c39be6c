-- CRM email verification, step 1 of docs/CRM_AUTOSEND_PLAN.md.
-- One row per (contact, address): contacts.email is a free text list, so the
-- result belongs to the address, not the contact. Nothing reads this to block
-- a send yet; the first release only displays it (shadow mode).

CREATE TABLE IF NOT EXISTS public.contact_email_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('verified', 'catch_all', 'invalid', 'unknown')),
  provider text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_email_checks_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT contact_email_checks_unique UNIQUE (contact_id, email)
);

CREATE INDEX IF NOT EXISTS contact_email_checks_contact_idx ON public.contact_email_checks(contact_id);
CREATE INDEX IF NOT EXISTS contact_email_checks_checked_at_idx ON public.contact_email_checks(checked_at);

ALTER TABLE public.contact_email_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select contact email checks"
  ON public.contact_email_checks FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can manage contact email checks"
  ON public.contact_email_checks FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));
