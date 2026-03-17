
-- Table for contact form and trade account form submissions
CREATE TABLE public.public_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_type text NOT NULL DEFAULT 'contact',
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_name text,
  message text,
  notes text,
  page_slug text,
  source_channel text NOT NULL DEFAULT 'website',
  honeypot text,
  ip_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public forms)
CREATE POLICY "Anyone can submit inquiries"
  ON public.public_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins/operators can read
CREATE POLICY "Admins can read inquiries"
  ON public.public_inquiries FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));
