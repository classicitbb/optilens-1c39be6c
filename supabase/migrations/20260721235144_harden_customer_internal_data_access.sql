-- Close broad authenticated reads that were inherited from has_any_role().
-- Customer portal price data continues to flow only through the existing
-- assigned-pricelist SECURITY DEFINER functions, which resolve the caller's
-- own customer and assigned version server-side.

CREATE OR REPLACE FUNCTION public.has_staff_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'operator'::public.app_role, 'viewer'::public.app_role)
  );
$function$;

REVOKE ALL ON FUNCTION public.has_staff_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_role(uuid) TO authenticated, service_role;

-- Remove only broad has_any_role SELECT/ALL policies from the internal tables,
-- retaining the existing editor/admin write policies and all customer-scoped
-- portal policies. Internal viewer accounts remain read-only staff.
DO $block$
DECLARE
  v_table text;
  v_policy text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'catalog_assignments', 'catalog_sections', 'catalog_templates',
    'crm_pipelines', 'cadences', 'cadence_steps', 'cadence_enrollments',
    'contact_tags', 'contact_tag_links', 'industries', 'order_activity',
    'outreach_outbox', 'help_article_contexts',
    'pricelist_versions', 'pricelist_catalog_rows', 'pricelist_overrides',
    'pricelist_line_overrides', 'pricelist_child_sections', 'pricelist_notes',
    'matrix_allocations', 'price_matrix', 'legacy_rates', 'material_upgrades',
    'rx_price_categories', 'rx_price_category_versions', 'rx_price_groupings',
    'rx_price_grouping_versions', 'addon_pricing_sheets', 'pricing_sheets'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;

    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND cmd IN ('SELECT', 'ALL')
        AND qual ILIKE '%has_any_role%'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, v_table);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO authenticated USING ((SELECT public.has_staff_role(auth.uid())))',
      'Staff can select internal ' || v_table,
      v_table
    );
  END LOOP;
END;
$block$;

-- Postgres views run with their creator's privileges unless marked as
-- security_invoker. Apply that setting to every public view so new linter
-- findings cannot bypass base-table RLS accidentally.
DO $block$
DECLARE
  v_view text;
BEGIN
  FOR v_view IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_view);
  END LOOP;
END;
$block$;

NOTIFY pgrst, 'reload schema';
