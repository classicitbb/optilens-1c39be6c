-- Seed CRM role permissions for existing environments
INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
VALUES
  ('admin'::app_role, 'crm', true, true),
  ('operator'::app_role, 'crm', true, true),
  ('viewer'::app_role, 'crm', true, false),
  ('customer'::app_role, 'crm', false, false)
ON CONFLICT (role, feature) DO NOTHING;
