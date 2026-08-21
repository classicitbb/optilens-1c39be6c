-- Durable, server-only commands for the outbound OptiLens Local worker.
CREATE TABLE public.qbo_integration_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command text NOT NULL CHECK (command IN ('disconnect', 'reconcile')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz NULL,
  completed_at timestamptz NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'completed', 'error')),
  result_sanitized jsonb NULL,
  error_message_sanitized text NULL
);
CREATE INDEX qbo_integration_commands_pending_idx ON public.qbo_integration_commands (requested_at) WHERE status = 'queued';
ALTER TABLE public.qbo_integration_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qbo_integration_commands FROM anon, authenticated;
