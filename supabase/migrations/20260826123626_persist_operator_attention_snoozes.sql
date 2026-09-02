-- Attention-alert snoozes belong to the signed-in operator, not the browser.
-- Keeping this narrow table user-owned means an admin's snooze follows them
-- across devices without changing any ticket or task workflow state.

CREATE TABLE IF NOT EXISTS public.operator_attention_snoozes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  snoozed_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_attention_snoozes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can select their own attention snooze" ON public.operator_attention_snoozes;
CREATE POLICY "Operators can select their own attention snooze"
  ON public.operator_attention_snoozes FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Operators can insert their own attention snooze" ON public.operator_attention_snoozes;
CREATE POLICY "Operators can insert their own attention snooze"
  ON public.operator_attention_snoozes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Operators can update their own attention snooze" ON public.operator_attention_snoozes;
CREATE POLICY "Operators can update their own attention snooze"
  ON public.operator_attention_snoozes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON TABLE public.operator_attention_snoozes TO authenticated;

DROP TRIGGER IF EXISTS update_operator_attention_snoozes_updated_at ON public.operator_attention_snoozes;
CREATE TRIGGER update_operator_attention_snoozes_updated_at
  BEFORE UPDATE ON public.operator_attention_snoozes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
