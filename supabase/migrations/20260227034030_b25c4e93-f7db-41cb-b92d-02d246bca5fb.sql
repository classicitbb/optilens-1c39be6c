
-- Add missing columns to contacts for lead management
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS google_rating numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_reviews_count integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_intent_score numeric DEFAULT 0;

-- Add missing columns to opportunities for CRM pipeline
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS country text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS volume_tier text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS estimated_value numeric DEFAULT NULL;

-- Add unique constraint on contact_id + title for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_contact_id_title_key ON public.opportunities (contact_id, title);

-- Add missing columns to activities for CRM activities
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS activity_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS due_at timestamp with time zone DEFAULT NULL;

-- Add RLS policies for opportunities (currently missing)
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can insert opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update opportunities"
  ON public.opportunities FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete opportunities"
  ON public.opportunities FOR DELETE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select opportunities"
  ON public.opportunities FOR SELECT
  USING (has_any_role(auth.uid()));

-- Add RLS policies for activities (currently missing)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can insert activities"
  ON public.activities FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update activities"
  ON public.activities FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete activities"
  ON public.activities FOR DELETE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select activities"
  ON public.activities FOR SELECT
  USING (has_any_role(auth.uid()));

-- Add unique constraint on contacts.name for upsert support (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS contacts_name_key ON public.contacts (name);
