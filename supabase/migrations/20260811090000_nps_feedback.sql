-- NPS (Net Promoter Score) feedback
-- Captures a 0-10 "how likely are you to recommend Classic Visions" score plus
-- an optional comment, tied to whatever interaction triggered the prompt
-- (an order, a resolved helpdesk ticket, or a manual/ad-hoc prompt).
--
-- Score bands (standard NPS definition):
--   0-6   = detractor
--   7-8   = passive
--   9-10  = promoter
-- NPS = %promoters - %detractors, range -100 to 100.

CREATE TABLE IF NOT EXISTS public.nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email TEXT,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment TEXT,
  trigger_context TEXT NOT NULL CHECK (trigger_context IN ('order', 'helpdesk_ticket', 'manual', 'other')),
  source_id UUID,
  source_label TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Customers can submit their own response.
DO $$ BEGIN
  CREATE POLICY "Users can submit their own NPS response"
    ON public.nps_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customers can see their own past responses (so the UI can suppress repeat prompts
-- for the same order/ticket without a second round trip through staff-only data).
DO $$ BEGIN
  CREATE POLICY "Users can view their own NPS responses"
    ON public.nps_responses FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Staff (admin/operator) can read every response for reporting.
DO $$ BEGIN
  CREATE POLICY "Staff can view all NPS responses"
    ON public.nps_responses FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_nps_responses_created ON public.nps_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nps_responses_trigger ON public.nps_responses(trigger_context, source_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_user ON public.nps_responses(user_id);

-- One response per user per order/ticket — the prompt should not re-fire once answered.
CREATE UNIQUE INDEX IF NOT EXISTS idx_nps_responses_unique_source
  ON public.nps_responses(user_id, trigger_context, source_id)
  WHERE source_id IS NOT NULL;

-- Summary view for the admin dashboard: promoters/passives/detractors + NPS score,
-- broken out per trigger context plus an overall row.
-- security_invoker so the view is evaluated against the *querying* user's RLS grants
-- (staff see everything via the "Staff can view all" policy above; a regular
-- customer querying it directly would only ever see their own single response).
CREATE OR REPLACE VIEW public.nps_score_summary
WITH (security_invoker = true) AS
SELECT
  trigger_context,
  count(*) AS total_responses,
  count(*) FILTER (WHERE score >= 9) AS promoters,
  count(*) FILTER (WHERE score BETWEEN 7 AND 8) AS passives,
  count(*) FILTER (WHERE score <= 6) AS detractors,
  round(
    (count(*) FILTER (WHERE score >= 9)::numeric - count(*) FILTER (WHERE score <= 6)::numeric)
    / NULLIF(count(*), 0) * 100
  , 1) AS nps_score
FROM public.nps_responses
GROUP BY trigger_context

UNION ALL

SELECT
  'overall' AS trigger_context,
  count(*) AS total_responses,
  count(*) FILTER (WHERE score >= 9) AS promoters,
  count(*) FILTER (WHERE score BETWEEN 7 AND 8) AS passives,
  count(*) FILTER (WHERE score <= 6) AS detractors,
  round(
    (count(*) FILTER (WHERE score >= 9)::numeric - count(*) FILTER (WHERE score <= 6)::numeric)
    / NULLIF(count(*), 0) * 100
  , 1) AS nps_score
FROM public.nps_responses;

GRANT SELECT ON public.nps_score_summary TO authenticated;
