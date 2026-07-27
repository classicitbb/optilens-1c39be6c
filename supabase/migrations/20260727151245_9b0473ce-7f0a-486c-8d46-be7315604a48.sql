REVOKE ALL ON public.edge_function_health FROM anon;
REVOKE ALL ON public.edge_function_health FROM PUBLIC;
REVOKE ALL ON public.edge_function_health_runs FROM anon;
REVOKE ALL ON public.edge_function_health_runs FROM PUBLIC;

GRANT SELECT ON public.edge_function_health TO authenticated;
GRANT SELECT ON public.edge_function_health_runs TO authenticated;
GRANT ALL ON public.edge_function_health TO service_role;
GRANT ALL ON public.edge_function_health_runs TO service_role;

ALTER TABLE public.edge_function_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_function_health_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_function_health FORCE ROW LEVEL SECURITY;
ALTER TABLE public.edge_function_health_runs FORCE ROW LEVEL SECURITY;