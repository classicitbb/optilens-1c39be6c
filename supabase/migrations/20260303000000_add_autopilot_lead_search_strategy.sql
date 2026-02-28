CREATE TABLE IF NOT EXISTS public.lead_search_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  subsegments text[] NOT NULL DEFAULT '{}'::text[],
  buyer_roles text[] NOT NULL DEFAULT '{}'::text[],
  exclusions text[] NOT NULL DEFAULT '{}'::text[],
  keyword_clusters text[] NOT NULL DEFAULT '{}'::text[],
  channel_hints text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_search_strategies_industry_idx ON public.lead_search_strategies(industry);
CREATE INDEX IF NOT EXISTS lead_search_strategies_active_idx ON public.lead_search_strategies(is_active);

ALTER TABLE public.lead_search_strategies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_search_strategies' AND policyname = 'lead_search_strategies_select_auth'
  ) THEN
    CREATE POLICY lead_search_strategies_select_auth
      ON public.lead_search_strategies FOR SELECT
      TO authenticated
      USING (has_any_role(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_search_strategies' AND policyname = 'lead_search_strategies_write_editors'
  ) THEN
    CREATE POLICY lead_search_strategies_write_editors
      ON public.lead_search_strategies FOR ALL
      TO authenticated
      USING (has_edit_role(auth.uid()))
      WITH CHECK (has_edit_role(auth.uid()));
  END IF;
END $$;

INSERT INTO public.lead_search_strategies (industry, subsegments, buyer_roles, exclusions, keyword_clusters, channel_hints)
VALUES
  (
    'optical lab procurement',
    ARRAY['optical laboratories', 'lens finishing labs'],
    ARRAY['procurement manager', 'lab operations manager'],
    ARRAY['luxury-only boutiques'],
    ARRAY['bulk lens supply', 'edging lab', 'single vision', 'progressive'],
    ARRAY['google_places', 'yellow_pages', 'industry_directories']
  ),
  (
    'owner-led stores',
    ARRAY['owner-operated optical retail'],
    ARRAY['owner', 'store operator'],
    ARRAY['franchise branch only'],
    ARRAY['optical store owner', 'margin optimization', 'independent eyewear retail'],
    ARRAY['google_places', 'facebook_graph', 'instagram_graph']
  ),
  (
    'chain branch managers',
    ARRAY['regional eyewear chains'],
    ARRAY['branch manager', 'regional manager'],
    ARRAY['single-doctor clinics'],
    ARRAY['chain optical branch', 'store manager eyewear', 'multi-location optical'],
    ARRAY['bing', 'google_places', 'facebook_graph']
  ),
  (
    'independent optometrists',
    ARRAY['independent eye clinics', 'optometrist-led practices'],
    ARRAY['practice owner', 'lead optometrist'],
    ARRAY['hospital ophthalmology departments'],
    ARRAY['independent optometrist', 'clinic procurement', 'contact lens replenishment'],
    ARRAY['google_places', 'whatsapp_business_signals', 'instagram_graph']
  )
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.lead_search_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  mode text NOT NULL CHECK (mode IN ('manual', 'autopilot')),
  query_input text NULL,
  strategy_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  strategy_ranked_intents jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_intent jsonb NULL,
  provider_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  providers_used text[] NOT NULL DEFAULT '{}'::text[],
  provider_telemetry jsonb NOT NULL DEFAULT '{}'::jsonb,
  leads_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_search_runs_user_id_idx ON public.lead_search_runs(user_id);
CREATE INDEX IF NOT EXISTS lead_search_runs_mode_idx ON public.lead_search_runs(mode);
CREATE INDEX IF NOT EXISTS lead_search_runs_created_at_idx ON public.lead_search_runs(created_at DESC);

ALTER TABLE public.lead_search_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_search_runs' AND policyname = 'lead_search_runs_select_auth'
  ) THEN
    CREATE POLICY lead_search_runs_select_auth
      ON public.lead_search_runs FOR SELECT
      TO authenticated
      USING (has_any_role(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_search_runs' AND policyname = 'lead_search_runs_insert_editors'
  ) THEN
    CREATE POLICY lead_search_runs_insert_editors
      ON public.lead_search_runs FOR INSERT
      TO authenticated
      WITH CHECK (has_edit_role(auth.uid()) AND user_id = auth.uid());
  END IF;
END $$;
