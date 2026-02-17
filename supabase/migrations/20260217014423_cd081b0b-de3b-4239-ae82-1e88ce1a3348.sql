
-- Role permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  feature text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, feature)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role_permissions"
  ON public.role_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Any role user can read role_permissions"
  ON public.role_permissions FOR SELECT
  USING (has_any_role(auth.uid()));

-- Seed default permissions
INSERT INTO public.role_permissions (role, feature, can_view, can_edit) VALUES
  ('admin', 'catalog', true, true),
  ('admin', 'reference', true, true),
  ('admin', 'pricing', true, true),
  ('admin', 'imports', true, true),
  ('admin', 'exports', true, true),
  ('admin', 'history', true, true),
  ('admin', 'parameters', true, true),
  ('admin', 'users', true, true),
  ('admin', 'audit', true, true),
  ('admin', 'wiki', true, false),
  ('operator', 'catalog', true, true),
  ('operator', 'reference', true, true),
  ('operator', 'pricing', true, true),
  ('operator', 'imports', true, true),
  ('operator', 'exports', true, true),
  ('operator', 'history', true, false),
  ('operator', 'parameters', false, false),
  ('operator', 'users', false, false),
  ('operator', 'audit', false, false),
  ('operator', 'wiki', true, false),
  ('viewer', 'catalog', true, false),
  ('viewer', 'reference', true, false),
  ('viewer', 'pricing', true, false),
  ('viewer', 'imports', false, false),
  ('viewer', 'exports', false, false),
  ('viewer', 'history', false, false),
  ('viewer', 'parameters', false, false),
  ('viewer', 'users', false, false),
  ('viewer', 'audit', false, false),
  ('viewer', 'wiki', true, false),
  ('customer', 'catalog', false, false),
  ('customer', 'reference', false, false),
  ('customer', 'pricing', true, false),
  ('customer', 'imports', false, false),
  ('customer', 'exports', false, false),
  ('customer', 'history', false, false),
  ('customer', 'parameters', false, false),
  ('customer', 'users', false, false),
  ('customer', 'audit', false, false),
  ('customer', 'wiki', true, false);

-- Customer pricing access table
CREATE TABLE public.customer_pricing_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pricing_sheet_id uuid NOT NULL REFERENCES public.pricing_sheets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pricing_sheet_id)
);

ALTER TABLE public.customer_pricing_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer_pricing_access"
  ON public.customer_pricing_access FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own pricing access"
  ON public.customer_pricing_access FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
