-- Add customer-related fields to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS is_customer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'New';

-- Add contact_id FK on customers table to link back
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_contacts_is_customer ON public.contacts(is_customer) WHERE is_customer = true;
CREATE INDEX IF NOT EXISTS idx_customers_contact_id ON public.customers(contact_id);