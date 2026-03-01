-- Core Helpdesk entities aligned with Odoo concepts

CREATE TABLE IF NOT EXISTS public.helpdesk_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  assignment_mode text NOT NULL DEFAULT 'manual',
  visibility text NOT NULL DEFAULT 'internal',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_teams_tenant_name_key UNIQUE (tenant_key, name),
  CONSTRAINT helpdesk_teams_assignment_mode_check CHECK (assignment_mode IN ('manual', 'round_robin', 'balanced', 'auto')),
  CONSTRAINT helpdesk_teams_visibility_check CHECK (visibility IN ('internal', 'invited', 'public'))
);

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NULL REFERENCES public.helpdesk_teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sequence integer NOT NULL DEFAULT 10,
  is_folded boolean NOT NULL DEFAULT false,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_stages_team_name_key UNIQUE (team_id, name)
);

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_types_tenant_name_key UNIQUE (tenant_key, name)
);

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  name text NOT NULL,
  color text NOT NULL DEFAULT '#14b8a6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_ticket_tags_tenant_name_key UNIQUE (tenant_key, name)
);

CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  tenant_key text NOT NULL DEFAULT 'default',
  team_id uuid REFERENCES public.helpdesk_teams(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.helpdesk_ticket_stages(id) ON DELETE SET NULL,
  ticket_type_id uuid REFERENCES public.helpdesk_ticket_types(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 1,
  partner_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at timestamptz NULL,
  assigned_at timestamptz NULL,
  closed_at timestamptz NULL,
  deadline timestamptz NULL,
  source_channel text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT helpdesk_tickets_tenant_ticket_number_key UNIQUE (tenant_key, ticket_number),
  CONSTRAINT helpdesk_tickets_priority_check CHECK (priority BETWEEN 0 AND 5),
  CONSTRAINT helpdesk_tickets_source_channel_check CHECK (source_channel IN ('manual', 'email', 'phone', 'chat', 'portal', 'api', 'odoo_sync'))
);

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_tag_rel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.helpdesk_ticket_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, tag_id)
);

-- Common access pattern indexes
CREATE INDEX IF NOT EXISTS helpdesk_tickets_team_id_idx
  ON public.helpdesk_tickets(team_id);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_stage_id_idx
  ON public.helpdesk_tickets(stage_id);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_owner_user_id_idx
  ON public.helpdesk_tickets(owner_user_id);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_priority_idx
  ON public.helpdesk_tickets(priority);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_create_date_idx
  ON public.helpdesk_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_deadline_idx
  ON public.helpdesk_tickets(deadline);

CREATE INDEX IF NOT EXISTS helpdesk_ticket_stages_team_id_sequence_idx
  ON public.helpdesk_ticket_stages(team_id, sequence);

CREATE INDEX IF NOT EXISTS helpdesk_ticket_tag_rel_ticket_id_idx
  ON public.helpdesk_ticket_tag_rel(ticket_id);
CREATE INDEX IF NOT EXISTS helpdesk_ticket_tag_rel_tag_id_idx
  ON public.helpdesk_ticket_tag_rel(tag_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS update_helpdesk_teams_updated_at ON public.helpdesk_teams;
CREATE TRIGGER update_helpdesk_teams_updated_at
  BEFORE UPDATE ON public.helpdesk_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_helpdesk_ticket_stages_updated_at ON public.helpdesk_ticket_stages;
CREATE TRIGGER update_helpdesk_ticket_stages_updated_at
  BEFORE UPDATE ON public.helpdesk_ticket_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_helpdesk_ticket_types_updated_at ON public.helpdesk_ticket_types;
CREATE TRIGGER update_helpdesk_ticket_types_updated_at
  BEFORE UPDATE ON public.helpdesk_ticket_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_helpdesk_ticket_tags_updated_at ON public.helpdesk_ticket_tags;
CREATE TRIGGER update_helpdesk_ticket_tags_updated_at
  BEFORE UPDATE ON public.helpdesk_ticket_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_helpdesk_tickets_updated_at ON public.helpdesk_tickets;
CREATE TRIGGER update_helpdesk_tickets_updated_at
  BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
