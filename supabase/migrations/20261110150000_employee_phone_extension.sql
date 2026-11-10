-- Phone extension on the People profile.
--
-- staff_extensions (user_id -> extension) is what click-to-call and the PBX agent
-- read, so it stays the single source of truth. HR edits it from the employee
-- profile through these two functions; the employee must have a linked login.
-- Apply via the Lovable SQL editor / MCP query_database.

CREATE OR REPLACE FUNCTION public.employee_extension(_employee_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_hr(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT s.extension
    FROM public.employees e
    JOIN public.staff_extensions s ON s.user_id = e.user_id
    WHERE e.id = _employee_id
  );
END;
$$;

-- Blank clears the extension. Raises a readable error if another person has it.
CREATE OR REPLACE FUNCTION public.set_employee_extension(_employee_id uuid, _extension text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ext text := nullif(trim(coalesce(_extension, '')), '');
  v_other text;
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

  SELECT coalesce(e.employee_no, e.first_name || ' ' || e.last_name) INTO v_other
  FROM public.staff_extensions s
  LEFT JOIN public.employees e ON e.user_id = s.user_id
  WHERE s.extension = v_ext AND s.user_id <> v_user_id;
  IF FOUND THEN
    RAISE EXCEPTION 'Extension % is already assigned to %.', v_ext, coalesce(v_other, 'another login');
  END IF;

  INSERT INTO public.staff_extensions (user_id, extension) VALUES (v_user_id, v_ext)
  ON CONFLICT (user_id) DO UPDATE SET extension = EXCLUDED.extension;
  RETURN v_ext;
END;
$$;

REVOKE ALL ON FUNCTION public.employee_extension(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_extension(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.set_employee_extension(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_employee_extension(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
