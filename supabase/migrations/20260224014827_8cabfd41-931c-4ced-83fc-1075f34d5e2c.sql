
-- Industries reference table
CREATE TABLE public.industries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select industries" ON public.industries FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert industries" ON public.industries FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update industries" ON public.industries FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete industries" ON public.industries FOR DELETE USING (has_edit_role(auth.uid()));

-- Contact tags
CREATE TABLE public.contact_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#14b8a6',
  category text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select contact_tags" ON public.contact_tags FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert contact_tags" ON public.contact_tags FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update contact_tags" ON public.contact_tags FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete contact_tags" ON public.contact_tags FOR DELETE USING (has_edit_role(auth.uid()));

-- Contacts (res_partners equivalent)
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  is_company boolean NOT NULL DEFAULT true,
  parent_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  street text DEFAULT '',
  street2 text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  zip text DEFAULT '',
  country_code text DEFAULT '',
  tax_id text DEFAULT '',
  website text DEFAULT '',
  industry_id uuid REFERENCES public.industries(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  salesperson text DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  avatar_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select contacts" ON public.contacts FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert contacts" ON public.contacts FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update contacts" ON public.contacts FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete contacts" ON public.contacts FOR DELETE USING (has_edit_role(auth.uid()));

-- Contact ↔ Tag many-to-many
CREATE TABLE public.contact_tag_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.contact_tags(id) ON DELETE CASCADE,
  UNIQUE(contact_id, tag_id)
);
ALTER TABLE public.contact_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select contact_tag_links" ON public.contact_tag_links FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert contact_tag_links" ON public.contact_tag_links FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete contact_tag_links" ON public.contact_tag_links FOR DELETE USING (has_edit_role(auth.uid()));

-- Seed some industries
INSERT INTO public.industries (name, full_name) VALUES
  ('Accounting', 'ACCT - Accounting'),
  ('Agriculture', 'AGRI - Agriculture'),
  ('Construction', 'CONS - Construction'),
  ('Education', 'EDUC - Education'),
  ('Healthcare', 'HLTH - Healthcare'),
  ('Manufacturing', 'MFGR - Manufacturing'),
  ('Optical', 'OPTL - Optical / Eyewear'),
  ('Retail', 'RETL - Retail'),
  ('Technology', 'TECH - Technology'),
  ('Wholesale', 'WHSL - Wholesale / Distribution');
