-- Website feature board: runtime flags + operator notes in one place.
-- Serves two purposes: (1) gate not-yet-live functionality (first user:
-- store checkout lockdown), (2) the operator's tuning surface — feature
-- requests/notes here are read by the AI build agents each session.

CREATE TABLE IF NOT EXISTS public.website_features (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NULL,
  enabled boolean NOT NULL DEFAULT false,
  notes text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.website_features ENABLE ROW LEVEL SECURITY;

-- Flags are public runtime config (never secrets) — anyone may read them so
-- the public site can gate features without auth; only editors manage them.
DROP POLICY IF EXISTS "Anyone can read website features" ON public.website_features;
CREATE POLICY "Anyone can read website features"
  ON public.website_features FOR SELECT USING (true);
DROP POLICY IF EXISTS "Editors can manage website features" ON public.website_features;
CREATE POLICY "Editors can manage website features"
  ON public.website_features FOR ALL
  USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

INSERT INTO public.website_features (key, label, description, enabled, notes) VALUES
  ('store_checkout', 'Store checkout', 'Allow customers to place web store orders. Off = browse-only storefront with ordering locked.', false, 'Locked until the store launch is approved.'),
  ('rx_order_form', 'Rx order form', 'Customer-facing Rx ordering with live price-as-you-type. Planned: reachable from pricelist rows ("Order this lens").', false, 'Design pending — see docs/CUSTOMER_EXPERIENCE_PLAN.md'),
  ('pricelist_portal_publishing', 'Pricelist portal publishing', 'Publish customer pricelists to their portal with expiring access.', false, 'Blocked on master->custom pricelist fork model.'),
  ('lens_assistant_public', 'Lens Assistant - public', 'Allow non-admin users to open the Lens Assistant from the portal and direct route.', false, 'Keep off until the customer-facing flow is approved.'),
  ('lens_assistant_admin', 'Lens Assistant - admin', 'Allow admins to preview and test Lens Assistant while public access is disabled.', true, 'Admin-only preview flag for the profile command-center branch.')
ON CONFLICT (key) DO NOTHING;
