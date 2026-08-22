-- Stock orders are a lab workflow. Keep the existing priced-account rule,
-- but only expose customer accounts that resolve to the CRM Is Lab tag.
-- The contact graph mirrors can_access_customer_lab_pricing: direct account
-- contact, its parent company, or any contact linked to the customer.
CREATE OR REPLACE VIEW public.stock_lens_eligible_accounts
WITH (security_invoker = true)
AS
SELECT DISTINCT c.id AS account_id, c.assigned_pricelist_id AS pricelist_version_id
FROM public.customers c
JOIN public.pricelist_catalog_rows r
  ON r.pricelist_version_id = c.assigned_pricelist_id
WHERE r.catalog_type = 'stock'
  AND r.row_type = 'stock_variant'
  AND r.bbd_price IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.contact_tag_links link
    INNER JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE lower(btrim(tag.name)) = 'is lab'
      AND link.contact_id IN (
        SELECT c.contact_id
        UNION
        SELECT contact.parent_id
        FROM public.contacts contact
        WHERE contact.id = c.contact_id
        UNION
        SELECT contact.id
        FROM public.contacts contact
        WHERE contact.linked_customer_id = c.id
      )
  );

GRANT SELECT ON public.stock_lens_eligible_accounts TO authenticated;
NOTIFY pgrst, 'reload schema';
