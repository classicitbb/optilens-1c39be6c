
-- Drop the view and recreate without security_invoker so it runs as owner (bypasses RLS on base table)
DROP VIEW IF EXISTS public.supplies_public;

CREATE VIEW public.supplies_public AS
  SELECT id, name, description, sell_price, category, unit, quantity_per_unit, image_url
  FROM public.supplies
  WHERE show_on_website = true AND is_active = true;

-- Drop the permissive public policy - anon users should only access via the view
DROP POLICY IF EXISTS "Public can view website supplies via view" ON public.supplies;
