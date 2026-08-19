-- Durable, user-owned Copilot conversations. Operational runs remain the
-- approval/audit unit and are linked to the chat that initiated them.

CREATE TABLE public.copilot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New chat',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX copilot_conversations_owner_updated_idx
  ON public.copilot_conversations (created_by, updated_at DESC);

ALTER TABLE public.copilot_runs
  ADD COLUMN conversation_id uuid REFERENCES public.copilot_conversations(id) ON DELETE SET NULL;

-- Preserve every existing run as its own restorable conversation.
INSERT INTO public.copilot_conversations (id, title, created_by, created_at, updated_at)
SELECT id, left(command_text, 120), requested_by, created_at, updated_at
FROM public.copilot_runs
ON CONFLICT (id) DO NOTHING;

UPDATE public.copilot_runs
SET conversation_id = id
WHERE conversation_id IS NULL;

CREATE INDEX copilot_runs_conversation_created_idx
  ON public.copilot_runs (conversation_id, created_at DESC);

CREATE TABLE public.copilot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX copilot_messages_conversation_created_idx
  ON public.copilot_messages (conversation_id, created_at);

-- Seed the user side of historical workflow runs. The existing run summary and
-- action cards continue to provide the assistant response.
INSERT INTO public.copilot_messages (conversation_id, role, content, created_at)
SELECT conversation_id, 'user', command_text, created_at
FROM public.copilot_runs
WHERE conversation_id IS NOT NULL;

ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read their Copilot conversations"
  ON public.copilot_conversations FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()) AND public.has_role((SELECT auth.uid()), 'admin'));
CREATE POLICY "Admins can read messages in their Copilot conversations"
  ON public.copilot_messages FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.copilot_conversations conversation
      WHERE conversation.id = conversation_id
        AND conversation.created_by = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.copilot_conversations, public.copilot_messages TO authenticated;

CREATE TRIGGER update_copilot_conversations_updated_at
  BEFORE UPDATE ON public.copilot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
