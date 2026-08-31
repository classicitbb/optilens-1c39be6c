CREATE OR REPLACE FUNCTION public.can_access_financial_data(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_user_id IS NOT NULL
    AND (
      auth.uid() IS NULL
      OR auth.uid() = p_user_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    AND public.has_role(p_user_id, 'admin'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.can_access_financial_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_financial_data(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.can_access_financial_data(uuid) IS
  'True only for existing app admins. Used by Iris and other server-side policy gates before exposing internal financial data.';