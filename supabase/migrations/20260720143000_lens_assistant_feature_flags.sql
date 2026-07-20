-- Lens Assistant feature board controls for staged portal rollout.

INSERT INTO public.website_features (key, label, description, enabled, notes) VALUES
  ('lens_assistant_public', 'Lens Assistant - public', 'Allow non-admin users to open the Lens Assistant from the portal and direct route.', false, 'Keep off until the customer-facing flow is approved.'),
  ('lens_assistant_admin', 'Lens Assistant - admin', 'Allow admins to preview and test Lens Assistant while public access is disabled.', true, 'Admin-only preview flag for the profile command-center branch.')
ON CONFLICT (key) DO NOTHING;
