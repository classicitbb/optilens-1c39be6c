-- Docstudio: staff-only reads
DROP POLICY IF EXISTS "Role users can select docstudio billing" ON public.docstudio_billing_documents;
CREATE POLICY "Staff can select docstudio billing"
  ON public.docstudio_billing_documents FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select docstudio files" ON public.docstudio_files;
CREATE POLICY "Staff can select docstudio files"
  ON public.docstudio_files FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

-- Helpdesk internal configuration: staff-only reads
DROP POLICY IF EXISTS "Authenticated users can view SLA policies" ON public.helpdesk_sla_policies;
CREATE POLICY "Staff can view SLA policies"
  ON public.helpdesk_sla_policies FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.helpdesk_team_members;
CREATE POLICY "Staff can view team members"
  ON public.helpdesk_team_members FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view helpdesk teams" ON public.helpdesk_teams;
CREATE POLICY "Staff can view helpdesk teams"
  ON public.helpdesk_teams FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view SLA status" ON public.helpdesk_ticket_sla_status;
CREATE POLICY "Staff can view SLA status"
  ON public.helpdesk_ticket_sla_status FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket stages" ON public.helpdesk_ticket_stages;
CREATE POLICY "Staff can view helpdesk ticket stages"
  ON public.helpdesk_ticket_stages FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket tag rel" ON public.helpdesk_ticket_tag_rel;
CREATE POLICY "Staff can view helpdesk ticket tag rel"
  ON public.helpdesk_ticket_tag_rel FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket tags" ON public.helpdesk_ticket_tags;
CREATE POLICY "Staff can view helpdesk ticket tags"
  ON public.helpdesk_ticket_tags FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket types" ON public.helpdesk_ticket_types;
CREATE POLICY "Staff can view helpdesk ticket types"
  ON public.helpdesk_ticket_types FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

-- Role/permission matrix: staff-only reads
DROP POLICY IF EXISTS "Any role user can read role_permissions" ON public.role_permissions;
CREATE POLICY "Staff can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));