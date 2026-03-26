
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS organization_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS portal_access_status text DEFAULT 'pending_profile',
  ADD COLUMN IF NOT EXISTS portal_access_note text DEFAULT '',
  ADD COLUMN IF NOT EXISTS crm_contact_id uuid,
  ADD COLUMN IF NOT EXISTS crm_customer_id integer,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS billing_address jsonb;

-- Backfill full_name from display_name for existing profiles
UPDATE public.profiles
SET full_name = COALESCE(display_name, '')
WHERE full_name = '' OR full_name IS NULL;
