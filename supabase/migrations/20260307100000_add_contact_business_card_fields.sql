alter table public.contacts
  add column if not exists business_card_image_url text,
  add column if not exists business_card_uploaded_at timestamptz,
  add column if not exists business_card_file_name text;
