-- Drop the overly permissive public SELECT policy for lenses
-- The store does not query lenses directly; only role users need access
DROP POLICY IF EXISTS "Anyone can view website lenses" ON public.lenses;