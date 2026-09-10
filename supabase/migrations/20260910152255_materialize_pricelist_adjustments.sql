-- Materialize price-list markup/discount settings as line overrides while
-- retaining every allocation/catalog BBD price as the Auto Price baseline.
-- The single RPC keeps the percentage settings and the generated overrides in
-- one transaction, so an editor never sees a half-applied adjustment.

CREATE OR REPLACE FUNCTION public.materialize_pricelist_adjustments(
  p_version_id integer,
  p_name text,
  p_base_currency text,
  p_is_template boolean,
  p_format_type text,
  p_markup_percent numeric,
  p_discount_percent numeric,
  p_master_markup_percent numeric,
  p_master_discount_percent numeric,
  p_child_adjustments jsonb
)
RETURNS TABLE(section_type text, applied_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_section_type text;
  v_section_id integer;
  v_child_markup numeric;
  v_child_discount numeric;
  v_factor numeric;
  v_count integer;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can materialize pricelist adjustments.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.pricelist_versions WHERE id = p_version_id) THEN
    RAISE EXCEPTION 'Pricelist version % not found.', p_version_id;
  END IF;

  UPDATE public.pricelist_versions
  SET name = btrim(p_name),
      base_currency = p_base_currency,
      is_template = p_is_template,
      format_type = p_format_type,
      markup_percent = COALESCE(p_markup_percent, 0),
      discount_percent = COALESCE(p_discount_percent, 0),
      master_markup_percent = COALESCE(p_master_markup_percent, 0),
      master_discount_percent = COALESCE(p_master_discount_percent, 0),
      updated_at = now()
  WHERE id = p_version_id;

  FOREACH v_section_type IN ARRAY ARRAY['RX Lens Prices', 'Stock Lens Prices', 'Supplies Prices']
  LOOP
    v_child_markup := COALESCE((p_child_adjustments -> v_section_type ->> 'markup')::numeric, 0);
    v_child_discount := COALESCE((p_child_adjustments -> v_section_type ->> 'discount')::numeric, 0);

    SELECT id
    INTO v_section_id
    FROM public.pricelist_child_sections
    WHERE pricelist_version_id = p_version_id
      AND section_type = v_section_type
    ORDER BY id
    LIMIT 1
    FOR UPDATE;

    IF v_section_id IS NULL THEN
      INSERT INTO public.pricelist_child_sections (
        pricelist_version_id,
        section_type,
        child_markup_percent,
        child_discount_percent
      )
      VALUES (p_version_id, v_section_type, v_child_markup, v_child_discount)
      RETURNING id INTO v_section_id;
    ELSE
      UPDATE public.pricelist_child_sections
      SET child_markup_percent = v_child_markup,
          child_discount_percent = v_child_discount,
          updated_at = now()
      WHERE id = v_section_id;
    END IF;

    -- A percentage update owns the complete section. Clear all existing line
    -- overrides first, including legacy duplicate child-section records, then
    -- recreate only prices that differ from their Auto Price baseline.
    DELETE FROM public.pricelist_line_overrides
    WHERE child_section_id IN (
      SELECT id
      FROM public.pricelist_child_sections
      WHERE pricelist_version_id = p_version_id
        AND section_type = v_section_type
    );

    v_factor := (1 + COALESCE(p_master_markup_percent, 0) / 100)
      * (1 - COALESCE(p_master_discount_percent, 0) / 100)
      * (1 + v_child_markup / 100)
      * (1 - v_child_discount / 100);
    v_count := 0;

    IF v_section_type = 'RX Lens Prices' THEN
      INSERT INTO public.pricelist_line_overrides (
        child_section_id, reference_type, reference_id, overridden_price_bbd, reason
      )
      SELECT
        v_section_id,
        'matrix_allocation',
        ma.id::text,
        round(ma.allocated_price_bbd * v_factor, 2),
        'Bulk markup/discount adjustment'
      FROM public.matrix_allocations ma
      WHERE ma.pricelist_version_id = p_version_id
        AND ma.is_active IS NOT FALSE
        AND ma.allocated_price_bbd IS NOT NULL
        AND round(ma.allocated_price_bbd * v_factor, 2) <> ma.allocated_price_bbd;
      GET DIAGNOSTICS v_count = ROW_COUNT;

      INSERT INTO public.pricelist_line_overrides (
        child_section_id, reference_type, reference_id, overridden_price_bbd, reason
      )
      SELECT
        v_section_id,
        r.row_type,
        r.item_id::text,
        round(r.bbd_price * v_factor, 2),
        'Bulk markup/discount adjustment'
      FROM public.pricelist_catalog_rows r
      WHERE r.pricelist_version_id = p_version_id
        AND r.catalog_type = 'rx'
        AND r.row_type IN ('addon', 'treatment', 'supply')
        AND r.item_id IS NOT NULL
        AND r.bbd_price IS NOT NULL
        AND round(r.bbd_price * v_factor, 2) <> r.bbd_price;
      GET DIAGNOSTICS applied_count = ROW_COUNT;
      v_count := v_count + applied_count;
    ELSIF v_section_type = 'Stock Lens Prices' THEN
      INSERT INTO public.pricelist_line_overrides (
        child_section_id, reference_type, reference_id, overridden_price_bbd, reason
      )
      SELECT
        v_section_id,
        r.row_type,
        r.item_id::text,
        round(r.bbd_price * v_factor, 2),
        'Bulk markup/discount adjustment'
      FROM public.pricelist_catalog_rows r
      WHERE r.pricelist_version_id = p_version_id
        AND r.catalog_type = 'stock'
        AND r.item_id IS NOT NULL
        AND r.bbd_price IS NOT NULL
        AND round(r.bbd_price * v_factor, 2) <> r.bbd_price;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSE
      INSERT INTO public.pricelist_line_overrides (
        child_section_id, reference_type, reference_id, overridden_price_bbd, reason
      )
      SELECT
        v_section_id,
        r.row_type,
        r.item_id::text,
        round(r.bbd_price * v_factor, 2),
        'Bulk markup/discount adjustment'
      FROM public.pricelist_catalog_rows r
      WHERE r.pricelist_version_id = p_version_id
        AND r.catalog_type = 'buysell'
        AND r.item_id IS NOT NULL
        AND r.bbd_price IS NOT NULL
        AND round(r.bbd_price * v_factor, 2) <> r.bbd_price;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;

    section_type := v_section_type;
    applied_count := v_count;
    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.materialize_pricelist_adjustments(integer, text, text, boolean, text, numeric, numeric, numeric, numeric, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.materialize_pricelist_adjustments(integer, text, text, boolean, text, numeric, numeric, numeric, numeric, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.materialize_pricelist_adjustments(integer, text, text, boolean, text, numeric, numeric, numeric, numeric, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
