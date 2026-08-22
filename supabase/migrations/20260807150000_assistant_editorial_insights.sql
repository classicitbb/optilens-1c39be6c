-- Anonymous assistant knowledge gaps become editorial opportunities only after
-- repeated demand. Prompts, transcripts, customer identities, and contact data
-- are deliberately excluded from this model.

CREATE TABLE IF NOT EXISTS public.assistant_editorial_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_key text NOT NULL CHECK (char_length(topic_key) BETWEEN 1 AND 120),
  audience text NOT NULL CHECK (audience IN ('visitor', 'patient', 'dispenser', 'customer', 'staff')),
  route text NOT NULL CHECK (route ~ '^/'),
  outcome text NOT NULL CHECK (outcome = 'unresolved'),
  session_hash text NOT NULL CHECK (char_length(session_hash) = 64),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (topic_key, session_hash)
);

CREATE INDEX IF NOT EXISTS assistant_editorial_signals_topic_window_idx
  ON public.assistant_editorial_signals(topic_key, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.assistant_editorial_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_key text NOT NULL UNIQUE,
  audience text NOT NULL,
  route text NOT NULL,
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  first_observed_at timestamptz NOT NULL,
  last_observed_at timestamptz NOT NULL,
  agent_activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  editorial_activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assistant_editorial_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_editorial_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view assistant editorial opportunities"
  ON public.assistant_editorial_opportunities FOR SELECT TO authenticated
  USING (public.has_staff_role((select auth.uid())));

CREATE OR REPLACE FUNCTION public.record_assistant_editorial_signal(
  p_topic_key text,
  p_audience text,
  p_route text,
  p_outcome text,
  p_session_hash text
)
RETURNS TABLE (qualified boolean, agent_activity_id uuid, editorial_activity_id uuid, source_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic_key text := lower(trim(p_topic_key));
  v_audience text := lower(trim(p_audience));
  v_route text := trim(p_route);
  v_count integer;
  v_first timestamptz;
  v_last timestamptz;
  v_opportunity public.assistant_editorial_opportunities%ROWTYPE;
  v_agent_activity_id uuid;
  v_editorial_activity_id uuid;
BEGIN
  IF v_topic_key !~ '^[a-z0-9:_-]{1,120}$'
    OR v_audience NOT IN ('visitor', 'patient', 'dispenser', 'customer', 'staff')
    OR v_route !~ '^/'
    OR p_outcome <> 'unresolved'
    OR p_session_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid anonymous assistant editorial signal';
  END IF;

  INSERT INTO public.assistant_editorial_signals(topic_key, audience, route, outcome, session_hash)
  VALUES (v_topic_key, v_audience, left(v_route, 180), p_outcome, p_session_hash)
  ON CONFLICT (topic_key, session_hash) DO NOTHING;

  SELECT count(DISTINCT session_hash)::integer, min(occurred_at), max(occurred_at)
  INTO v_count, v_first, v_last
  FROM public.assistant_editorial_signals
  WHERE topic_key = v_topic_key AND occurred_at >= now() - interval '30 days';

  IF v_count < 5 THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, v_count;
    RETURN;
  END IF;

  INSERT INTO public.assistant_editorial_opportunities(
    topic_key, audience, route, source_count, first_observed_at, last_observed_at
  ) VALUES (v_topic_key, v_audience, left(v_route, 180), v_count, v_first, v_last)
  ON CONFLICT (topic_key) DO UPDATE SET
    audience = EXCLUDED.audience,
    route = EXCLUDED.route,
    source_count = EXCLUDED.source_count,
    first_observed_at = EXCLUDED.first_observed_at,
    last_observed_at = EXCLUDED.last_observed_at,
    updated_at = now()
  RETURNING * INTO v_opportunity;

  v_agent_activity_id := v_opportunity.agent_activity_id;
  v_editorial_activity_id := v_opportunity.editorial_activity_id;

  IF v_agent_activity_id IS NULL OR v_editorial_activity_id IS NULL THEN
    INSERT INTO public.activities(activity_type, type, task_channel, status, priority, content, payload)
    VALUES (
      'assistant_editorial_brief', 'note', 'agent_todo', 'inbox', 'normal',
      format(
        'Create an editorial brief for recurring assistant knowledge gap "%s". Audience: %s. Demand: %s distinct anonymous conversations in 30 days. Include search intent, a blog angle, a newsletter angle, and a publication-ready outline.',
        replace(v_topic_key, ':', ' / '), v_audience, v_count
      ),
      jsonb_build_object('source', 'assistant_editorial_signal', 'topic_key', v_topic_key, 'source_count', v_count, 'window_days', 30)
    ) RETURNING id INTO v_agent_activity_id;

    INSERT INTO public.activities(activity_type, type, task_channel, status, priority, content, payload)
    VALUES (
      'assistant_editorial_review', 'note', 'todo', 'inbox', 'normal',
      format(
        'Review the editorial brief for "%s" and decide whether to publish a blog post, newsletter item, both, or neither. Human approval is required before publication.',
        replace(v_topic_key, ':', ' / ')
      ),
      jsonb_build_object('source', 'assistant_editorial_signal', 'topic_key', v_topic_key, 'agent_activity_id', v_agent_activity_id, 'source_count', v_count, 'window_days', 30)
    ) RETURNING id INTO v_editorial_activity_id;

    UPDATE public.assistant_editorial_opportunities
    SET agent_activity_id = v_agent_activity_id,
        editorial_activity_id = v_editorial_activity_id,
        updated_at = now()
    WHERE id = v_opportunity.id;
  END IF;

  RETURN QUERY SELECT true, v_agent_activity_id, v_editorial_activity_id, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_assistant_editorial_signal(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_assistant_editorial_signal(text, text, text, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
