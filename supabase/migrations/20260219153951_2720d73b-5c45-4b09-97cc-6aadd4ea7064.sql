-- Add email format validation constraint to wholesale_inquiries
ALTER TABLE public.wholesale_inquiries
  ADD CONSTRAINT wholesale_inquiries_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$');

-- Add length constraints on text fields to prevent abuse
ALTER TABLE public.wholesale_inquiries
  ADD CONSTRAINT wholesale_inquiries_business_name_length CHECK (char_length(business_name) <= 200),
  ADD CONSTRAINT wholesale_inquiries_contact_name_length CHECK (char_length(contact_name) <= 200),
  ADD CONSTRAINT wholesale_inquiries_phone_length CHECK (phone IS NULL OR char_length(phone) <= 50),
  ADD CONSTRAINT wholesale_inquiries_comments_length CHECK (comments IS NULL OR char_length(comments) <= 2000),
  ADD CONSTRAINT wholesale_inquiries_location_length CHECK (location IS NULL OR char_length(location) <= 200);