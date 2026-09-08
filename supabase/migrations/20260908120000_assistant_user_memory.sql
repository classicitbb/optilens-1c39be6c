-- Per-user facts Iris carries between conversations. Owner-only by RLS: this is
-- personal context, never shared knowledge. Org-wide facts belong in
-- help_articles, which goes through editorial review before any assistant
-- surface can cite them.

CREATE TABLE public.assistant_user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- Which assistant surface may read this. 'admin' = Portal Copilot,
  -- 'portal' = signed-in customer assistant (not wired up yet).
  surface text NOT NULL DEFAULT 'admin' CHECK (surface IN ('admin', 'portal')),
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'preference', 'role', 'workflow', 'contact')),
  content text NOT NULL
    CHECK (char_length(btrim(content)) BETWEEN 1 AND 500),
  -- How it got here, for the audit trail: the assistant proposed it, or the
  -- user typed it into the memory manager.
  source text NOT NULL DEFAULT 'assistant' CHECK (source IN ('assistant', 'manual')),
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assistant_user_memory_lookup_idx
  ON public.assistant_user_memory (user_id, surface, is_active);

-- One fact, once. Prevents the assistant re-saving a near-identical line every
-- session and silently filling the prompt budget.
CREATE UNIQUE INDEX assistant_user_memory_dedupe_idx
  ON public.assistant_user_memory (user_id, surface, lower(btrim(content)));

CREATE TRIGGER update_assistant_user_memory_updated_at
  BEFORE UPDATE ON public.assistant_user_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.assistant_user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own assistant memory"
  ON public.assistant_user_memory
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users write own assistant memory"
  ON public.assistant_user_memory
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users update own assistant memory"
  ON public.assistant_user_memory
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users delete own assistant memory"
  ON public.assistant_user_memory
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

REVOKE ALL ON TABLE public.assistant_user_memory FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_user_memory TO authenticated;
GRANT ALL ON TABLE public.assistant_user_memory TO service_role;

-- The prompt cost of this table is paid on every conversation turn, so the
-- active-fact count is capped in the database rather than by convention.
CREATE OR REPLACE FUNCTION public.enforce_assistant_memory_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.assistant_user_memory
    WHERE user_id = NEW.user_id AND surface = NEW.surface AND is_active
  ) > 40 THEN
    RAISE EXCEPTION 'assistant memory budget exceeded (40 active facts per surface)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER assistant_user_memory_budget
  AFTER INSERT OR UPDATE ON public.assistant_user_memory
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assistant_memory_budget();

COMMENT ON TABLE public.assistant_user_memory IS
  'Owner-only personal facts injected into an assistant system prompt. Never company policy or shared knowledge.';
