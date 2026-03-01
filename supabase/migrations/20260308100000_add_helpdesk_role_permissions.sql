-- Seed role permissions for Helpdesk modules
INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
VALUES
  ('admin'::app_role, 'helpdesk', true, true),
  ('operator'::app_role, 'helpdesk', true, true),
  ('viewer'::app_role, 'helpdesk', true, false),
  ('customer'::app_role, 'helpdesk', false, false),

  ('admin'::app_role, 'helpdesk-teams', true, true),
  ('operator'::app_role, 'helpdesk-teams', true, true),
  ('viewer'::app_role, 'helpdesk-teams', true, false),
  ('customer'::app_role, 'helpdesk-teams', false, false),

  ('admin'::app_role, 'helpdesk-sla', true, true),
  ('operator'::app_role, 'helpdesk-sla', true, true),
  ('viewer'::app_role, 'helpdesk-sla', true, false),
  ('customer'::app_role, 'helpdesk-sla', false, false)
ON CONFLICT (role, feature) DO NOTHING;
