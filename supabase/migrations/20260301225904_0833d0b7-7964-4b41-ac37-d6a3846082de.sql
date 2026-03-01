
-- Base Helpdesk schema (prerequisites for SLA migration)

-- Teams
CREATE TABLE IF NOT EXISTS public.helpdesk_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_teams_tenant_name_key UNIQUE (tenant_key, name)
);

ALTER TABLE public.helpdesk_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view helpdesk teams"
  ON public.helpdesk_teams FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert helpdesk teams"
  ON public.helpdesk_teams FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update helpdesk teams"
  ON public.helpdesk_teams FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete helpdesk teams"
  ON public.helpdesk_teams FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Ticket stages (kanban columns)
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  sequence integer NOT NULL DEFAULT 10,
  is_closed boolean NOT NULL DEFAULT false,
  is_folded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_stages_tenant_name_key UNIQUE (tenant_key, name)
);

ALTER TABLE public.helpdesk_ticket_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view helpdesk ticket stages"
  ON public.helpdesk_ticket_stages FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can manage helpdesk ticket stages"
  ON public.helpdesk_ticket_stages FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update helpdesk ticket stages"
  ON public.helpdesk_ticket_stages FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete helpdesk ticket stages"
  ON public.helpdesk_ticket_stages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Ticket types
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_types_tenant_name_key UNIQUE (tenant_key, name)
);

ALTER TABLE public.helpdesk_ticket_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view helpdesk ticket types"
  ON public.helpdesk_ticket_types FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can manage helpdesk ticket types"
  ON public.helpdesk_ticket_types FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()));

-- Ticket tags
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_tags_tenant_name_key UNIQUE (tenant_key, name)
);

ALTER TABLE public.helpdesk_ticket_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view helpdesk ticket tags"
  ON public.helpdesk_ticket_tags FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can manage helpdesk ticket tags"
  ON public.helpdesk_ticket_tags FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()));

-- Tickets
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  ticket_number text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority integer NOT NULL DEFAULT 1 CHECK (priority BETWEEN 0 AND 5),
  team_id uuid REFERENCES public.helpdesk_teams(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.helpdesk_ticket_stages(id) ON DELETE SET NULL,
  ticket_type_id uuid REFERENCES public.helpdesk_ticket_types(id) ON DELETE SET NULL,
  partner_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_user_id uuid,
  deadline timestamptz,
  opened_at timestamptz,
  assigned_at timestamptz,
  closed_at timestamptz,
  source_channel text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_tickets_tenant_number_key UNIQUE (tenant_key, ticket_number)
);

CREATE INDEX helpdesk_tickets_team_id_idx ON public.helpdesk_tickets(team_id);
CREATE INDEX helpdesk_tickets_stage_id_idx ON public.helpdesk_tickets(stage_id);
CREATE INDEX helpdesk_tickets_owner_user_id_idx ON public.helpdesk_tickets(owner_user_id);

ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view helpdesk tickets"
  ON public.helpdesk_tickets FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert helpdesk tickets"
  ON public.helpdesk_tickets FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update helpdesk tickets"
  ON public.helpdesk_tickets FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete helpdesk tickets"
  ON public.helpdesk_tickets FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Ticket events (timeline)
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX helpdesk_ticket_events_ticket_id_idx ON public.helpdesk_ticket_events(ticket_id);

ALTER TABLE public.helpdesk_ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view helpdesk ticket events"
  ON public.helpdesk_ticket_events FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert helpdesk ticket events"
  ON public.helpdesk_ticket_events FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

-- Ticket-tag relation
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_tag_rel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.helpdesk_ticket_tags(id) ON DELETE CASCADE,
  CONSTRAINT helpdesk_ticket_tag_rel_unique UNIQUE (ticket_id, tag_id)
);

ALTER TABLE public.helpdesk_ticket_tag_rel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view helpdesk ticket tag rel"
  ON public.helpdesk_ticket_tag_rel FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can manage helpdesk ticket tag rel"
  ON public.helpdesk_ticket_tag_rel FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()));

-- Updated-at triggers
CREATE TRIGGER update_helpdesk_teams_updated_at
  BEFORE UPDATE ON public.helpdesk_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_ticket_stages_updated_at
  BEFORE UPDATE ON public.helpdesk_ticket_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_tickets_updated_at
  BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_helpdesk_ticket_types_updated_at
  BEFORE UPDATE ON public.helpdesk_ticket_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default stages
INSERT INTO public.helpdesk_ticket_stages (tenant_key, name, sequence, is_closed, is_folded) VALUES
  ('default', 'New', 10, false, false),
  ('default', 'In Progress', 20, false, false),
  ('default', 'Waiting', 30, false, true),
  ('default', 'Resolved', 40, true, false),
  ('default', 'Cancelled', 50, true, true)
ON CONFLICT DO NOTHING;

-- Add missing permissions rows for helpdesk features
INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
SELECT r.role, f.feature, 
  CASE WHEN r.role IN ('admin', 'operator') THEN true ELSE false END,
  CASE WHEN r.role = 'admin' THEN true ELSE false END
FROM (VALUES ('admin'::app_role), ('operator'::app_role), ('viewer'::app_role), ('customer'::app_role)) r(role)
CROSS JOIN (VALUES ('helpdesk'), ('helpdesk-teams'), ('helpdesk-sla')) f(feature)
ON CONFLICT DO NOTHING;

-- Also ensure integrations feature permission rows exist
INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
SELECT r.role, 'integrations',
  CASE WHEN r.role = 'admin' THEN true ELSE false END,
  CASE WHEN r.role = 'admin' THEN true ELSE false END
FROM (VALUES ('admin'::app_role), ('operator'::app_role), ('viewer'::app_role), ('customer'::app_role)) r(role)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
