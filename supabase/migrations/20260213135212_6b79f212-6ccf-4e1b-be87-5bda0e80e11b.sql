
-- Audit log table for tracking all admin changes
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  old_data jsonb,
  new_data jsonb,
  change_summary jsonb,
  reason text
);

-- Index for common queries
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_record_id ON public.audit_log(record_id);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Any role holder can read audit logs
CREATE POLICY "Role users can select audit_log"
  ON public.audit_log FOR SELECT
  USING (has_any_role(auth.uid()));

-- Editors can insert audit log entries
CREATE POLICY "Editors can insert audit_log"
  ON public.audit_log FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));
