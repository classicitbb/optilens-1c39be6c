
ALTER TABLE public.innovations_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innovations_sync_dead_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage innovations_sync_runs" ON public.innovations_sync_runs;
CREATE POLICY "Admins manage innovations_sync_runs"
  ON public.innovations_sync_runs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage innovations_sync_dead_letters" ON public.innovations_sync_dead_letters;
CREATE POLICY "Admins manage innovations_sync_dead_letters"
  ON public.innovations_sync_dead_letters FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_innovations_sync_runs_entity_started
  ON public.innovations_sync_runs (entity, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_innovations_sync_dead_letters_status
  ON public.innovations_sync_dead_letters (status, created_at DESC);

DROP TRIGGER IF EXISTS update_innovations_sync_dead_letters_updated_at ON public.innovations_sync_dead_letters;
CREATE TRIGGER update_innovations_sync_dead_letters_updated_at
  BEFORE UPDATE ON public.innovations_sync_dead_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
