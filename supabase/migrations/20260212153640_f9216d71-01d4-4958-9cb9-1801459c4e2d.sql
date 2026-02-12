
CREATE TABLE public.finishtypes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.finishtypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select finishtypes" ON public.finishtypes FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert finishtypes" ON public.finishtypes FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update finishtypes" ON public.finishtypes FOR UPDATE USING (has_edit_role(auth.uid()));

CREATE TRIGGER update_finishtypes_updated_at
  BEFORE UPDATE ON public.finishtypes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
