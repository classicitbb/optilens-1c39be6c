REVOKE EXECUTE ON FUNCTION public.ensure_staff_retail_membership() FROM authenticated;

NOTIFY pgrst, 'reload schema';