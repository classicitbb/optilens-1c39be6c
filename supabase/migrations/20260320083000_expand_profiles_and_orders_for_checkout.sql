ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS billing_address jsonb;

UPDATE public.profiles
SET full_name = COALESCE(NULLIF(full_name, ''), NULLIF(display_name, ''))
WHERE COALESCE(full_name, '') = '';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS checkout_method text NOT NULL DEFAULT 'manual';
