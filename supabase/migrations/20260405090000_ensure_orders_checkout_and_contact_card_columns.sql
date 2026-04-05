-- Repair migration: ensures columns referenced by place_customer_order() and
-- the contacts business-card feature exist, even if earlier migrations were
-- skipped or partially applied.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS checkout_method text NOT NULL DEFAULT 'manual';

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS business_card_image_url text,
  ADD COLUMN IF NOT EXISTS business_card_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_card_file_name text;
