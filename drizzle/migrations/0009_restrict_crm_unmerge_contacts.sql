REVOKE EXECUTE ON FUNCTION public.crm_unmerge_contacts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_unmerge_contacts(uuid) TO authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.contact_merge_log FROM PUBLIC, anon, authenticated;