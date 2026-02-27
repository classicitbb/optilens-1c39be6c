
-- Add new columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Barbados',
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS facebook_page_id text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0;

-- Migrate existing data
UPDATE public.contacts SET type = CASE WHEN is_company THEN 'business' ELSE 'individual' END;
UPDATE public.contacts SET business_name = name WHERE is_company = true;
UPDATE public.contacts SET address = CONCAT_WS(', ', NULLIF(street,''), NULLIF(street2,''), NULLIF(city,''), NULLIF(state,''), NULLIF(zip,''));
UPDATE public.contacts SET country = CASE
  WHEN country_code IN ('BRB','BB','Barbados') THEN 'Barbados'
  WHEN country_code IN ('JAM','JM','Jamaica') THEN 'Jamaica'
  WHEN country_code IN ('TTO','TT','Trinidad and Tobago') THEN 'Trinidad and Tobago'
  WHEN country_code IN ('GUY','GY','Guyana') THEN 'Guyana'
  WHEN country_code IN ('LCA','LC','St. Lucia') THEN 'St. Lucia'
  WHEN country_code IN ('GRD','GD','Grenada') THEN 'Grenada'
  WHEN country_code IN ('ATG','AG','Antigua') THEN 'Antigua'
  WHEN country_code IN ('DMA','DM','Dominica') THEN 'Dominica'
  WHEN country_code IN ('VCT','VC','St. Vincent') THEN 'St. Vincent'
  WHEN country_code IN ('BHS','BS','Bahamas') THEN 'Bahamas'
  WHEN country_code IN ('CYM','KY','Cayman') THEN 'Cayman'
  WHEN country_code IN ('TCA','TC','Turks and Caicos') THEN 'Turks and Caicos'
  ELSE 'Barbados'
END;
UPDATE public.contacts SET status = CASE
  WHEN is_customer THEN 'customer'
  WHEN pipeline_stage = 'New' THEN 'lead'
  WHEN pipeline_stage = 'Qualified' THEN 'prospect'
  WHEN is_archived THEN 'inactive'
  ELSE 'lead'
END;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_contacts_country ON public.contacts(country);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact_id ON public.opportunities(contact_id);
