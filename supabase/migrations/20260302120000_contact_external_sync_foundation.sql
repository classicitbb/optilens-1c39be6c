-- Foundation tables for Odoo contact synchronization and diff-safe state tracking.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS mobile text;

CREATE INDEX IF NOT EXISTS idx_contacts_parent_id ON public.contacts(parent_id);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON public.contacts(updated_at);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_country ON public.contacts(country);

CREATE TABLE IF NOT EXISTS public.contact_external_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  external_model text NOT NULL DEFAULT 'res.partner' CHECK (external_model = 'res.partner'),
  external_id text NOT NULL,
  external_company_id text NOT NULL,
  external_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  etag text,
  payload_hash text,
  last_pulled_at timestamptz,
  last_pushed_at timestamptz,
  last_remote_write_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, external_model, external_id, external_company_id)
);

COMMENT ON COLUMN public.contact_external_links.external_payload IS
  'Stores Odoo partner fields without stable local equivalents (nested/computed/provider-specific data) to preserve fidelity without premature normalization.';

ALTER TABLE public.contact_external_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select contact_external_links"
  ON public.contact_external_links FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert contact_external_links"
  ON public.contact_external_links FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update contact_external_links"
  ON public.contact_external_links FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete contact_external_links"
  ON public.contact_external_links FOR DELETE USING (has_edit_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_contact_external_links_local_contact_id
  ON public.contact_external_links(local_contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_external_links_sync_timestamps
  ON public.contact_external_links(last_pulled_at, last_pushed_at, last_remote_write_date);

CREATE TABLE IF NOT EXISTS public.contact_sync_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  external_model text NOT NULL DEFAULT 'res.partner' CHECK (external_model = 'res.partner'),
  external_company_id text NOT NULL,
  local_version bigint NOT NULL DEFAULT 0,
  remote_version bigint NOT NULL DEFAULT 0,
  local_field_checksums jsonb NOT NULL DEFAULT '{}'::jsonb,
  remote_field_checksums jsonb NOT NULL DEFAULT '{}'::jsonb,
  diff_checksum text,
  last_compared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(local_contact_id, provider, external_model, external_company_id)
);

ALTER TABLE public.contact_sync_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select contact_sync_states"
  ON public.contact_sync_states FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert contact_sync_states"
  ON public.contact_sync_states FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update contact_sync_states"
  ON public.contact_sync_states FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete contact_sync_states"
  ON public.contact_sync_states FOR DELETE USING (has_edit_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_contact_sync_states_updated_at
  ON public.contact_sync_states(updated_at);

CREATE TABLE IF NOT EXISTS public.contact_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'odoo' CHECK (provider = 'odoo'),
  external_model text NOT NULL DEFAULT 'res.partner' CHECK (external_model = 'res.partner'),
  external_field text NOT NULL,
  local_field text,
  sync_direction text NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('pull', 'push', 'bidirectional')),
  is_required boolean NOT NULL DEFAULT false,
  transform_rule text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, external_model, external_field)
);

ALTER TABLE public.contact_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select contact_field_mappings"
  ON public.contact_field_mappings FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert contact_field_mappings"
  ON public.contact_field_mappings FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update contact_field_mappings"
  ON public.contact_field_mappings FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete contact_field_mappings"
  ON public.contact_field_mappings FOR DELETE USING (has_edit_role(auth.uid()));

INSERT INTO public.contact_field_mappings (
  provider,
  external_model,
  external_field,
  local_field,
  sync_direction,
  is_required,
  transform_rule,
  notes
) VALUES
  ('odoo', 'res.partner', 'name', 'name', 'bidirectional', true, null, 'Canonical contact display name.'),
  ('odoo', 'res.partner', 'is_company', 'is_company', 'bidirectional', true, null, 'Company vs person flag.'),
  ('odoo', 'res.partner', 'parent_id', 'parent_id', 'bidirectional', false, 'resolve via contact_external_links.external_id', 'Parent partner hierarchy.'),
  ('odoo', 'res.partner', 'type', 'type', 'bidirectional', false, null, 'Address/contact type classification.'),
  ('odoo', 'res.partner', 'email', 'email', 'bidirectional', false, null, 'Primary email.'),
  ('odoo', 'res.partner', 'phone', 'phone', 'bidirectional', false, null, 'Primary phone number.'),
  ('odoo', 'res.partner', 'mobile', 'mobile', 'bidirectional', false, null, 'Mobile number.'),
  ('odoo', 'res.partner', 'website', 'website', 'bidirectional', false, null, 'Company or personal website.'),
  ('odoo', 'res.partner', 'street', 'street', 'bidirectional', false, null, 'Address line 1.'),
  ('odoo', 'res.partner', 'street2', 'street2', 'bidirectional', false, null, 'Address line 2.'),
  ('odoo', 'res.partner', 'city', 'city', 'bidirectional', false, null, 'City/locality.'),
  ('odoo', 'res.partner', 'state_id', 'state', 'bidirectional', false, 'map relation label/code', 'Stored as denormalized state text locally.'),
  ('odoo', 'res.partner', 'zip', 'zip', 'bidirectional', false, null, 'Postal code.'),
  ('odoo', 'res.partner', 'country_id', 'country', 'bidirectional', false, 'map relation label/code', 'Stored as country name locally.'),
  ('odoo', 'res.partner', 'vat', 'tax_id', 'bidirectional', false, null, 'VAT/tax identifier.'),
  ('odoo', 'res.partner', 'industry_id', 'industry_id', 'bidirectional', false, 'resolve to industries.id', 'Industry reference.'),
  ('odoo', 'res.partner', 'category_id', 'contact_tag_links.tag_id', 'bidirectional', false, 'sync many-to-many via contact_tag_links', 'Tags/categories are normalized via contact_tag_links.'),
  ('odoo', 'res.partner', 'active', 'is_archived', 'bidirectional', false, 'is_archived = NOT active', 'Odoo active true maps to local non-archived state.')
ON CONFLICT (provider, external_model, external_field) DO UPDATE SET
  local_field = EXCLUDED.local_field,
  sync_direction = EXCLUDED.sync_direction,
  is_required = EXCLUDED.is_required,
  transform_rule = EXCLUDED.transform_rule,
  notes = EXCLUDED.notes,
  updated_at = now();
