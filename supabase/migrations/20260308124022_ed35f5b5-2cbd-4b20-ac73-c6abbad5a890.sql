-- Add missing columns to helpdesk_teams
ALTER TABLE public.helpdesk_teams ADD COLUMN IF NOT EXISTS assignment_mode text NOT NULL DEFAULT 'manual';
ALTER TABLE public.helpdesk_teams ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal';

-- Create SLA policies table
CREATE TABLE IF NOT EXISTS public.helpdesk_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  team_id uuid REFERENCES public.helpdesk_teams(id) ON DELETE CASCADE,
  target_stage_id uuid REFERENCES public.helpdesk_ticket_stages(id) ON DELETE SET NULL,
  target_hours numeric NOT NULL DEFAULT 24,
  priority_filter integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.helpdesk_sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view SLA policies"
  ON public.helpdesk_sla_policies FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Editors can insert SLA policies"
  ON public.helpdesk_sla_policies FOR INSERT TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Editors can update SLA policies"
  ON public.helpdesk_sla_policies FOR UPDATE TO authenticated
  USING (public.has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete SLA policies"
  ON public.helpdesk_sla_policies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create SLA status tracking table
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_sla_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  sla_policy_id uuid NOT NULL REFERENCES public.helpdesk_sla_policies(id) ON DELETE CASCADE,
  deadline_at timestamptz,
  reached_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, sla_policy_id)
);

ALTER TABLE public.helpdesk_ticket_sla_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view SLA status"
  ON public.helpdesk_ticket_sla_status FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Editors can insert SLA status"
  ON public.helpdesk_ticket_sla_status FOR INSERT TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE POLICY "Editors can update SLA status"
  ON public.helpdesk_ticket_sla_status FOR UPDATE TO authenticated
  USING (public.has_edit_role(auth.uid()));