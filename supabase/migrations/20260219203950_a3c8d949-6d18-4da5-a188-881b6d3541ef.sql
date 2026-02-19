-- Insert role_permissions for the 3 new pricing modules with explicit casting
INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
VALUES
  ('admin'::app_role,    'rx-lens-prices',    true, true),
  ('admin'::app_role,    'stock-lens-prices', true, true),
  ('admin'::app_role,    'buy-sell-prices',   true, true),
  ('operator'::app_role, 'rx-lens-prices',    true, true),
  ('operator'::app_role, 'stock-lens-prices', true, true),
  ('operator'::app_role, 'buy-sell-prices',   true, true),
  ('viewer'::app_role,   'rx-lens-prices',    true, false),
  ('viewer'::app_role,   'stock-lens-prices', true, false),
  ('viewer'::app_role,   'buy-sell-prices',   true, false),
  ('customer'::app_role, 'rx-lens-prices',    false, false),
  ('customer'::app_role, 'stock-lens-prices', false, false),
  ('customer'::app_role, 'buy-sell-prices',   false, false)
ON CONFLICT DO NOTHING;