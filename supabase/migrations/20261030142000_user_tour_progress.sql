-- Help system phase 1: per-user guided tour progress (tour definitions live in src/help/tours).
-- Progress only stops a tour from launching itself again on later visits; users can replay any
-- tour at any time from the help panel, the top-bar help menu or the Training hub.

CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id text NOT NULL,
  seen_at timestamptz,
  completed_at timestamptz,
  last_step integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tour_id)
);

ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tour progress" ON public.user_tour_progress;
CREATE POLICY "Users read own tour progress" ON public.user_tour_progress
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users insert own tour progress" ON public.user_tour_progress;
CREATE POLICY "Users insert own tour progress" ON public.user_tour_progress
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update own tour progress" ON public.user_tour_progress;
CREATE POLICY "Users update own tour progress" ON public.user_tour_progress
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users delete own tour progress" ON public.user_tour_progress;
CREATE POLICY "Users delete own tour progress" ON public.user_tour_progress
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tour_progress TO authenticated;
