-- Separate work queues from the existing communication type on CRM activities.
-- Existing records and all callers that omit the new field remain in Todo.
DO $$
BEGIN
  CREATE TYPE public.activity_task_channel AS ENUM ('todo', 'agent_todo');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS task_channel public.activity_task_channel;

UPDATE public.activities
SET task_channel = 'todo'
WHERE task_channel IS NULL;

ALTER TABLE public.activities
  ALTER COLUMN task_channel SET DEFAULT 'todo',
  ALTER COLUMN task_channel SET NOT NULL;

CREATE INDEX IF NOT EXISTS activities_task_channel_idx
  ON public.activities(task_channel);

NOTIFY pgrst, 'reload schema';
