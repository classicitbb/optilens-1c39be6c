-- Restore SELECT grant to authenticated so RLS policies (staff-only) can apply via PostgREST.
-- Anon remains without SELECT so cost columns are only reachable via *_public views.
GRANT SELECT ON public.lenses TO authenticated;
GRANT SELECT ON public.addons TO authenticated;
GRANT SELECT ON public.supplies TO authenticated;