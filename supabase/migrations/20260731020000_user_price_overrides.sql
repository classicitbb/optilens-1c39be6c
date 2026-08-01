-- Let portal users type their own retail price over a pricelist row instead
-- of revealing the wholesale price behind the Show/Hide toggle. Purely
-- additive and independent of every existing pricing system (see
-- docs/PRICING_WHICH_TABLE.md) — this stores the user's own retail markup,
-- not a wholesale-cost fork, so it does NOT touch pricelist_versions /
-- pricelist_lines / pricing_sheets.

CREATE TABLE IF NOT EXISTS public.user_price_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  row_key text NOT NULL,
  custom_price numeric NOT NULL CHECK (custom_price >= 0),
  currency_code text NOT NULL DEFAULT 'BBD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, row_key)
);

ALTER TABLE public.user_price_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own price overrides"
  ON public.user_price_overrides FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own price overrides"
  ON public.user_price_overrides FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own price overrides"
  ON public.user_price_overrides FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own price overrides"
  ON public.user_price_overrides FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_user_price_overrides_updated_at
  BEFORE UPDATE ON public.user_price_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expose row_key + catalog_type from pricelist_catalog_rows so the portal
-- can key a per-user override to a specific stock/supply/addon row. Both
-- RPCs already resolve the caller's own pricelist_version_id server-side —
-- only the returned columns change here, no new access surface.

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_catalog(p_catalog_type text)
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer,
  row_key text,
  catalog_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
BEGIN
  IF p_catalog_type NOT IN ('rx', 'stock', 'buysell') THEN
    RETURN;
  END IF;

  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.section, r.display_description, r.row_type, r.bbd_price, r.sort_order, r.row_key, r.catalog_type
  FROM public.pricelist_catalog_rows r
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = p_catalog_type
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_catalog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_catalog(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_addons()
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer,
  row_key text,
  catalog_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
BEGIN
  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  -- Row types mirror the admin RX live preview's add-on list
  -- (PricelistLivePreview: addon, treatment, supply for catalog_type rx).
  RETURN QUERY
  SELECT r.section, r.display_description, r.row_type, r.bbd_price, r.sort_order, r.row_key, r.catalog_type
  FROM public.pricelist_catalog_rows r
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = 'rx'
    AND r.row_type IN ('addon', 'treatment', 'supply')
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_addons() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_addons() TO authenticated;

NOTIFY pgrst, 'reload schema';
