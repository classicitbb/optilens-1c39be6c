CREATE OR REPLACE VIEW public.supplies_public
WITH (security_invoker = true)
AS
SELECT id,
    name,
    description,
    sell_price,
    category,
    unit,
    quantity_per_unit,
    image_url
FROM supplies
WHERE show_on_website = true AND is_active = true;