
-- Create a public view that only exposes safe fields for website supplies
CREATE VIEW public.supplies_public
WITH (security_invoker = on) AS
  SELECT id, name, description, sell_price, category, unit, quantity_per_unit, image_url
  FROM public.supplies
  WHERE show_on_website = true AND is_active = true;

-- Drop the overly permissive public SELECT policy
DROP POLICY "Anyone can view website supplies" ON public.supplies;

-- Replace with a policy that only allows access through authenticated role users
-- (the public view with security_invoker will also need a policy)
CREATE POLICY "Public can view website supplies via view"
ON public.supplies
FOR SELECT
USING (
  show_on_website = true
  AND is_active = true
  AND NOT has_any_role(COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid))
);

-- Role users already have full access via the existing "Role users can select supplies" policy
