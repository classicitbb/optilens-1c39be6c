
-- Create wholesale_inquiries table for ZenVue partner applications
CREATE TABLE public.wholesale_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'other',
  monthly_volume TEXT,
  location TEXT,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  referral_source TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wholesale_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a wholesale inquiry
CREATE POLICY "Anyone can submit wholesale inquiry"
  ON public.wholesale_inquiries
  FOR INSERT
  WITH CHECK (true);

-- Only admin role users can view inquiries
CREATE POLICY "Admins can view wholesale inquiries"
  ON public.wholesale_inquiries
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update status
CREATE POLICY "Admins can update wholesale inquiries"
  ON public.wholesale_inquiries
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
