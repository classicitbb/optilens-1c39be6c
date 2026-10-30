-- Employee self-service (/me): HR links an employee record to the person's own
-- login. HR can't read auth.users, so linking by email and showing the linked
-- email go through these functions. Everything an employee sees on /me is
-- already limited by the "Employees read own ..." policies on each table.

CREATE OR REPLACE FUNCTION public.link_employee_login(_employee_id uuid, _email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_other text;
BEGIN
  IF NOT public.can_hr(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT id, email INTO v_user_id, v_email FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No account uses %. Ask them to sign up first, then link it.', trim(_email);
  END IF;

  SELECT coalesce(employee_no, first_name || ' ' || last_name) INTO v_other
  FROM public.employees WHERE user_id = v_user_id AND id <> _employee_id;
  IF v_other IS NOT NULL THEN
    RAISE EXCEPTION 'That account is already linked to employee %', v_other;
  END IF;

  UPDATE public.employees SET user_id = v_user_id WHERE id = _employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.employee_login_email(_employee_id uuid)
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
  RETURN (SELECT u.email FROM public.employees e JOIN auth.users u ON u.id = e.user_id WHERE e.id = _employee_id);
END;
$$;

REVOKE ALL ON FUNCTION public.link_employee_login(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_employee_login(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.employee_login_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_login_email(uuid) TO authenticated;
