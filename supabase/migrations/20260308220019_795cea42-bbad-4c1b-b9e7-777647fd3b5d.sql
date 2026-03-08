
-- Team members join table
CREATE TABLE public.helpdesk_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.helpdesk_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

ALTER TABLE public.helpdesk_team_members ENABLE ROW LEVEL SECURITY;

-- Any authenticated user with a role can read team members
CREATE POLICY "Authenticated users can view team members"
  ON public.helpdesk_team_members FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Only admins/operators can manage team members
CREATE POLICY "Admins and operators can manage team members"
  ON public.helpdesk_team_members FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));
