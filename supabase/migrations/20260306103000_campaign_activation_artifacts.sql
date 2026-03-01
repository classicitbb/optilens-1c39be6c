ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS lead_segment text;

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_lead_segment_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_lead_segment_check
  CHECK (lead_segment IS NULL OR lead_segment IN ('decision_makers', 'operators', 'procurement_influencers'));

CREATE TABLE IF NOT EXISTS public.campaign_activation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  lead_source text NOT NULL DEFAULT 'unknown',
  lead_segment text NOT NULL CHECK (lead_segment IN ('decision_makers', 'operators', 'procurement_influencers')),
  audience_hypotheses jsonb NOT NULL DEFAULT '[]'::jsonb,
  creative_angles jsonb NOT NULL DEFAULT '[]'::jsonb,
  channel_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_audience_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_messaging_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  packet jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_activation_profiles_contact_idx
  ON public.campaign_activation_profiles(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_activation_profiles_segment_idx
  ON public.campaign_activation_profiles(lead_segment, lead_source, created_at DESC);

ALTER TABLE public.campaign_activation_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaign_activation_profiles' AND policyname = 'campaign_activation_profiles_select_auth'
  ) THEN
    CREATE POLICY campaign_activation_profiles_select_auth
      ON public.campaign_activation_profiles FOR SELECT
      USING (has_any_role(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaign_activation_profiles' AND policyname = 'campaign_activation_profiles_write_editors'
  ) THEN
    CREATE POLICY campaign_activation_profiles_write_editors
      ON public.campaign_activation_profiles FOR ALL
      USING (has_edit_role(auth.uid()))
      WITH CHECK (has_edit_role(auth.uid()));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.campaign_activation_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.campaign_activation_profiles(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  lead_source text NOT NULL,
  lead_segment text NOT NULL CHECK (lead_segment IN ('decision_makers', 'operators', 'procurement_influencers')),
  channel text NOT NULL,
  campaign_name text NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  qualified_leads integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  spend numeric(12,2) NOT NULL DEFAULT 0,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  event_date date NOT NULL DEFAULT current_date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_activation_performance_rollup_idx
  ON public.campaign_activation_performance(event_date DESC, lead_source, lead_segment, channel);

ALTER TABLE public.campaign_activation_performance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaign_activation_performance' AND policyname = 'campaign_activation_performance_select_auth'
  ) THEN
    CREATE POLICY campaign_activation_performance_select_auth
      ON public.campaign_activation_performance FOR SELECT
      USING (has_any_role(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaign_activation_performance' AND policyname = 'campaign_activation_performance_write_editors'
  ) THEN
    CREATE POLICY campaign_activation_performance_write_editors
      ON public.campaign_activation_performance FOR ALL
      USING (has_edit_role(auth.uid()))
      WITH CHECK (has_edit_role(auth.uid()));
  END IF;
END;
$$;
