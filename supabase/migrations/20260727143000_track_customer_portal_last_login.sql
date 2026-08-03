-- Keep a customer-facing login timestamp separate from auth.users.last_sign_in_at.
-- Admin "sign in as customer" emulation creates a real auth session, so the
-- browser deliberately does not call this function while emulation is active.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_portal_login_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_last_portal_login_at_idx
  ON public.profiles (last_portal_login_at DESC);

CREATE OR REPLACE FUNCTION public.record_customer_portal_login()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_auth_last_sign_in_at timestamptz;
  v_recorded_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'record_customer_portal_login requires an authenticated user';
  END IF;

  -- Website Portals only reports customer logins; staff accounts do not become
  -- customer activity merely because they authenticate elsewhere in the app.
  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_user_id
      AND role IN ('admin', 'operator', 'viewer')
  ) THEN
    RETURN NULL;
  END IF;

  SELECT last_sign_in_at
  INTO v_auth_last_sign_in_at
  FROM auth.users
  WHERE id = v_user_id;

  IF v_auth_last_sign_in_at IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
  SET last_portal_login_at = v_auth_last_sign_in_at
  WHERE user_id = v_user_id
    AND (last_portal_login_at IS NULL OR last_portal_login_at < v_auth_last_sign_in_at)
  RETURNING last_portal_login_at INTO v_recorded_at;

  RETURN COALESCE(v_recorded_at, v_auth_last_sign_in_at);
END;
$$;

REVOKE ALL ON FUNCTION public.record_customer_portal_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_customer_portal_login() TO authenticated, service_role;
