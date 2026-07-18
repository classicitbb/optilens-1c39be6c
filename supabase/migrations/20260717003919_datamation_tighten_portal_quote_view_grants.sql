-- Tighten customer-portal quote view privileges to read-only. Supabase default
-- privileges granted broader view permissions to authenticated/service_role
-- after the views were restored; the portal only needs SELECT.

REVOKE ALL ON public.quotes_customer FROM PUBLIC;
REVOKE ALL ON public.quotes_customer FROM anon;
REVOKE ALL ON public.quotes_customer FROM authenticated;
REVOKE ALL ON public.quotes_customer FROM service_role;
GRANT SELECT ON public.quotes_customer TO authenticated;
GRANT SELECT ON public.quotes_customer TO service_role;

REVOKE ALL ON public.quote_lines_customer FROM PUBLIC;
REVOKE ALL ON public.quote_lines_customer FROM anon;
REVOKE ALL ON public.quote_lines_customer FROM authenticated;
REVOKE ALL ON public.quote_lines_customer FROM service_role;
GRANT SELECT ON public.quote_lines_customer TO authenticated;
GRANT SELECT ON public.quote_lines_customer TO service_role;

NOTIFY pgrst, 'reload schema';
