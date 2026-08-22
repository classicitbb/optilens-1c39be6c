-- CV Portal Copilot MVP: admin-only ERP portal rollout runs, approvals and audit.
-- This extends the existing Classic Visions MCP/action surfaces; it does not
-- create a second customer, contact, portal membership or email system.

CREATE TABLE public.copilot_workflow_settings (
  workflow text PRIMARY KEY,
  provider text NOT NULL DEFAULT 'claude' CHECK (provider = 'claude'),
  model text,
  email_template_key text NOT NULL,
  email_template_name text NOT NULL,
  email_subject_pattern text NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.copilot_workflow_settings (
  workflow,
  email_template_key,
  email_template_name,
  email_subject_pattern
) VALUES (
  'erp_portal_rollout',
  'builtin:erp-portal-access-v1',
  'ERP Portal Access v1',
  'Your Classic Visions portal access — {{customer_name}}'
) ON CONFLICT (workflow) DO NOTHING;

CREATE TABLE public.copilot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow text NOT NULL REFERENCES public.copilot_workflow_settings(workflow),
  command_text text NOT NULL,
  input_mode text NOT NULL DEFAULT 'text' CHECK (input_mode IN ('text', 'voice')),
  transcript text,
  transcript_confirmed boolean NOT NULL DEFAULT false,
  autonomy_level smallint NOT NULL DEFAULT 2 CHECK (autonomy_level BETWEEN 0 AND 4),
  status text NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing', 'prepared', 'partial', 'completed', 'failed', 'rejected')),
  source_system text NOT NULL DEFAULT 'innovations_sync',
  source_snapshot_at timestamptz NOT NULL DEFAULT now(),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX copilot_runs_requested_created_idx
  ON public.copilot_runs (requested_by, created_at DESC);

CREATE TABLE public.copilot_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.copilot_runs(id) ON DELETE CASCADE,
  customer_id integer REFERENCES public.customers(id) ON DELETE RESTRICT,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE RESTRICT,
  action_type text NOT NULL CHECK (action_type IN ('send_portal_invite', 'create_followup_task')),
  risk_level smallint NOT NULL CHECK (risk_level BETWEEN 0 AND 4),
  status text NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'executing', 'completed', 'failed', 'rejected', 'blocked')),
  title text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  idempotency_key text NOT NULL UNIQUE,
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_error text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX copilot_actions_run_status_idx
  ON public.copilot_actions (run_id, status, created_at);

CREATE TABLE public.copilot_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.copilot_runs(id) ON DELETE SET NULL,
  action_id uuid REFERENCES public.copilot_actions(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  transcript text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX copilot_audit_run_created_idx
  ON public.copilot_audit_events (run_id, created_at DESC);

ALTER TABLE public.copilot_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read Copilot workflow settings"
  ON public.copilot_workflow_settings FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));
CREATE POLICY "Admins can update Copilot workflow settings"
  ON public.copilot_workflow_settings FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Admins can read Copilot runs"
  ON public.copilot_runs FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));
CREATE POLICY "Admins can read Copilot actions"
  ON public.copilot_actions FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));
CREATE POLICY "Admins can read Copilot audit events"
  ON public.copilot_audit_events FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

GRANT SELECT ON public.copilot_workflow_settings, public.copilot_runs, public.copilot_actions, public.copilot_audit_events TO authenticated;

CREATE TRIGGER update_copilot_workflow_settings_updated_at
  BEFORE UPDATE ON public.copilot_workflow_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_copilot_runs_updated_at
  BEFORE UPDATE ON public.copilot_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_copilot_actions_updated_at
  BEFORE UPDATE ON public.copilot_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
