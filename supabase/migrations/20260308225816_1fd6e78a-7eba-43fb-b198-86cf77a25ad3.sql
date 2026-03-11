
CREATE TABLE public.helpdesk_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.helpdesk_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view priorities"
  ON public.helpdesk_priorities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors can manage priorities"
  ON public.helpdesk_priorities FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

INSERT INTO public.helpdesk_priorities (level, label, color) VALUES
  (0, 'Low', '#6b7280'),
  (1, 'Normal', '#6b7280'),
  (2, 'Medium', '#f59e0b'),
  (3, 'High', '#f97316'),
  (4, 'Urgent', '#ef4444'),
  (5, 'Critical', '#dc2626');
