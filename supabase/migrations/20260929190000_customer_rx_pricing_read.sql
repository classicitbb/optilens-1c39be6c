-- APPLIED to the live database 2026-09-29 via Lovable MCP query_database.
--
-- Customers' Rx order form prices every lens "on request".
--
-- The form reads four tables to price a lens. Since the product-cost hardening
-- (innovations_lens_aliases restricted to staff in 20260828203927; the
-- matrix/pricelist tables carry "Staff can select internal …" policies) a
-- customer gets ZERO rows from all four, so the alias index is empty, the price
-- matrix is empty, and nothing is orderable. Staff are unaffected, which is why
-- it went unnoticed. Verified 2026-09-29 by querying as a customer:
--   matrix_allocations 0 · innovations_lens_aliases 0 · pricelist_versions 0 ·
--   pricelist_catalog_rows 0
--
-- The fix is deliberately narrower than "let customers read those tables":
--
--   matrix_allocations       customers read ONLY rows of a pricelist version
--                            assigned to an account they belong to.
--   pricelist_catalog_rows   same scoping. This is the customer's own pricelist
--                            (they already download it as "Assigned Pricelist").
--   innovations_lens_aliases NOT opened. The table has a `suppliers` column
--                            (which labs supply a lens) and RLS cannot hide one
--                            column. A function exposes only the fields the form
--                            needs, and the form calls the function.
--   pricelist_versions       NOT opened. It holds markup_percent / discount_
--                            percent. The form only wants `name`, and a blocked
--                            read returns null rather than an error, so it
--                            degrades to no label instead of breaking.
--
-- NOTE FOR DEPLOY: migration files pushed to git are NOT executed against the
-- live database. Apply through the Lovable MCP query_database tool. The form
-- also needs the one-line change in useInnovationsCatalog.ts (call get_rx_catalog_aliases)
-- to be published.

-- ── 1. Which pricelist versions belong to this user ─────────────────────────
-- Same two routes the portal uses to resolve "my accounts": an active
-- membership, or the profile's own resolved customer.
CREATE OR REPLACE FUNCTION public.user_assigned_pricelist_version_ids(p_user_id uuid DEFAULT auth.uid())
RETURNS SETOF integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.assigned_pricelist_id
  FROM public.portal_account_memberships m
  JOIN public.customers c ON c.id = m.customer_id
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
    AND c.assigned_pricelist_id IS NOT NULL
  UNION
  SELECT c.assigned_pricelist_id
  FROM public.profiles p
  JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = p_user_id
    AND p.portal_access_status = 'approved_customer'
    AND p.archived_at IS NULL
    AND c.assigned_pricelist_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.user_assigned_pricelist_version_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_assigned_pricelist_version_ids(uuid) TO authenticated;

-- ── 2. Price matrix + catalog rows, own version only ────────────────────────
DROP POLICY IF EXISTS "Customers can select assigned matrix_allocations" ON public.matrix_allocations;
CREATE POLICY "Customers can select assigned matrix_allocations"
ON public.matrix_allocations FOR SELECT TO authenticated
USING (
  is_active
  AND NOT public.has_staff_role(auth.uid())
  AND pricelist_version_id IN (SELECT public.user_assigned_pricelist_version_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Customers can select assigned pricelist_catalog_rows" ON public.pricelist_catalog_rows;
CREATE POLICY "Customers can select assigned pricelist_catalog_rows"
ON public.pricelist_catalog_rows FOR SELECT TO authenticated
USING (
  NOT public.has_staff_role(auth.uid())
  AND pricelist_version_id IN (SELECT public.user_assigned_pricelist_version_ids(auth.uid()))
);

-- ── 3. Alias catalogue without the supplier list ────────────────────────────
-- A SECURITY DEFINER function, not a view: the repo's customer-data audit
-- (scripts/audit_customer_data_access.mjs) requires every public view to be
-- security_invoker, and an invoker view would run as the customer and read the
-- staff-only table as zero rows. The function runs with the owner's rights; its
-- WHERE clause is the access rule, and the result carries only the fields the
-- form needs — `suppliers` and `synced_at` are intentionally absent.
--
-- (An earlier revision of this migration created a view, rx_catalog_aliases,
-- and was applied that way on 2026-09-29; it was replaced by this function on
-- 2026-09-30 and the view dropped.)
DROP VIEW IF EXISTS public.rx_catalog_aliases;

CREATE OR REPLACE FUNCTION public.get_rx_catalog_aliases()
RETURNS TABLE (
  alias text, material_code text, material_description text,
  style_code text, style_description text,
  color_code text, color_description text,
  mf_type text, category text, pricing_key text, is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.alias, a.material_code, a.material_description,
         a.style_code, a.style_description,
         a.color_code, a.color_description,
         a.mf_type, a.category, a.pricing_key, a.is_active
  FROM public.innovations_lens_aliases a
  WHERE a.is_active
    AND public.has_any_role(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_rx_catalog_aliases() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rx_catalog_aliases() TO authenticated;

-- ── Rollback ────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.get_rx_catalog_aliases();
-- DROP POLICY IF EXISTS "Customers can select assigned pricelist_catalog_rows" ON public.pricelist_catalog_rows;
-- DROP POLICY IF EXISTS "Customers can select assigned matrix_allocations" ON public.matrix_allocations;
-- DROP FUNCTION IF EXISTS public.user_assigned_pricelist_version_ids(uuid);
