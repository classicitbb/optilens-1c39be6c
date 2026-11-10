-- Several people can share one phone extension (e.g. a front-desk phone).
-- Drops the UNIQUE constraint on staff_extensions.extension and the duplicate
-- check in set_employee_extension. Each login still has at most one extension.
-- Apply via the Lovable MCP query_database.

ALTER TABLE public.staff_extensions DROP CONSTRAINT IF EXISTS staff_extensions_extension_key;

CREATE OR REPLACE FUNCTION public.set_employee_extension(_employee_id uuid, _extension text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ext text := nullif(trim(coalesce(_extension, '')), '');
BEGIN
  IF NOT public.can_hr(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO v_user_id FROM public.employees WHERE id = _employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Link this employee to a login first; calls are placed from the login''s extension.';
  END IF;

  IF v_ext IS NULL THEN
    DELETE FROM public.staff_extensions WHERE user_id = v_user_id;
    RETURN NULL;
  END IF;

  IF v_ext !~ '^[0-9]{2,8}$' THEN
    RAISE EXCEPTION 'An extension is 2 to 8 digits.';
  END IF;

  INSERT INTO public.staff_extensions (user_id, extension) VALUES (v_user_id, v_ext)
  ON CONFLICT (user_id) DO UPDATE SET extension = EXCLUDED.extension;
  RETURN v_ext;
END;
$$;

REVOKE ALL ON FUNCTION public.set_employee_extension(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_employee_extension(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
