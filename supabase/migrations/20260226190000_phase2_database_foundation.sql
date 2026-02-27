-- Phase 2 Database Foundation (v1)
-- Creates/aligns core leads+crm tables and flags required by catalog package builder.

-- 1) Ensure contacts is SoT and has lead enrichment fields
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS facebook_page text,
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_rating numeric,
  ADD COLUMN IF NOT EXISTS google_reviews_count integer,
  ADD COLUMN IF NOT EXISTS ai_intent_score integer;

-- 2) Opportunities
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'new',
  country text,
  volume_tier text,
  selected_product_ids uuid[] DEFAULT '{}',
  estimated_value numeric,
  close_probability integer,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunities_contact_id_idx ON public.opportunities(contact_id);
CREATE INDEX IF NOT EXISTS opportunities_stage_idx ON public.opportunities(stage);

-- 3) Lead audits
CREATE TABLE IF NOT EXISTS public.lead_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  score integer NOT NULL DEFAULT 0,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  generated_pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_audits_contact_id_idx ON public.lead_audits(contact_id);
CREATE INDEX IF NOT EXISTS lead_audits_opportunity_id_idx ON public.lead_audits(opportunity_id);

-- 4) Activities
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  due_at timestamptz,
  completed_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_contact_id_idx ON public.activities(contact_id);
CREATE INDEX IF NOT EXISTS activities_opportunity_id_idx ON public.activities(opportunity_id);
CREATE INDEX IF NOT EXISTS activities_due_at_idx ON public.activities(due_at);

-- 5) Notes
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  content text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_contact_id_idx ON public.notes(contact_id);
CREATE INDEX IF NOT EXISTS notes_opportunity_id_idx ON public.notes(opportunity_id);

-- 6) price_catalog + required flags
CREATE TABLE IF NOT EXISTS public.price_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text,
  name text NOT NULL,
  category text,
  description text,
  unit_price numeric,
  web_enabled boolean NOT NULL DEFAULT false,
  wspl_enabled boolean NOT NULL DEFAULT false,
  source_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_catalog
  ADD COLUMN IF NOT EXISTS web_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wspl_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS price_catalog_name_idx ON public.price_catalog(name);
CREATE INDEX IF NOT EXISTS price_catalog_web_enabled_idx ON public.price_catalog(web_enabled);
CREATE INDEX IF NOT EXISTS price_catalog_wspl_enabled_idx ON public.price_catalog(wspl_enabled);

-- 7) proposal attachments for one-click attach
CREATE TABLE IF NOT EXISTS public.opportunity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  attachment_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunity_attachments_opportunity_id_idx ON public.opportunity_attachments(opportunity_id);

-- 8) Basic RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_attachments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='opportunities' AND policyname='opportunities_select_auth') THEN
    CREATE POLICY opportunities_select_auth ON public.opportunities FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='opportunities' AND policyname='opportunities_write_auth') THEN
    CREATE POLICY opportunities_write_auth ON public.opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_audits' AND policyname='lead_audits_select_auth') THEN
    CREATE POLICY lead_audits_select_auth ON public.lead_audits FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_audits' AND policyname='lead_audits_write_auth') THEN
    CREATE POLICY lead_audits_write_auth ON public.lead_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activities' AND policyname='activities_select_auth') THEN
    CREATE POLICY activities_select_auth ON public.activities FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activities' AND policyname='activities_write_auth') THEN
    CREATE POLICY activities_write_auth ON public.activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notes' AND policyname='notes_select_auth') THEN
    CREATE POLICY notes_select_auth ON public.notes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notes' AND policyname='notes_write_auth') THEN
    CREATE POLICY notes_write_auth ON public.notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='price_catalog' AND policyname='price_catalog_select_auth') THEN
    CREATE POLICY price_catalog_select_auth ON public.price_catalog FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='price_catalog' AND policyname='price_catalog_write_auth') THEN
    CREATE POLICY price_catalog_write_auth ON public.price_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='opportunity_attachments' AND policyname='opportunity_attachments_select_auth') THEN
    CREATE POLICY opportunity_attachments_select_auth ON public.opportunity_attachments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='opportunity_attachments' AND policyname='opportunity_attachments_write_auth') THEN
    CREATE POLICY opportunity_attachments_write_auth ON public.opportunity_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
