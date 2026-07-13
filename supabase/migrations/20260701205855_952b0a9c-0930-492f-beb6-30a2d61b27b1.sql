REVOKE ALL ON public.invoices_public FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.balances_public FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.statements_public FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.statement_lines_public FROM anon, authenticated, PUBLIC;

GRANT SELECT ON public.invoices_public TO authenticated, service_role;
GRANT SELECT ON public.balances_public TO authenticated, service_role;
GRANT SELECT ON public.statements_public TO authenticated, service_role;
GRANT SELECT ON public.statement_lines_public TO authenticated, service_role;