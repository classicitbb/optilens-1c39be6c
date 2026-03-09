
-- Replace the overly permissive INSERT policy with field validation
DROP POLICY IF EXISTS "Anyone can submit wholesale inquiry" ON public.wholesale_inquiries;

CREATE POLICY "Anyone can submit wholesale inquiry"
ON public.wholesale_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(business_name)) > 0
  AND length(trim(contact_name)) > 0
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND status = 'new'
);
