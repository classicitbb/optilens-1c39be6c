-- Distinguish operator-entered prices from generated percentage adjustments.
-- Existing rows are classified conservatively: only the exact historical bulk
-- reason is generated; every other row is manual. No duplicate rows are
-- removed by this migration.

ALTER TABLE public.pricelist_line_overrides
  ADD COLUMN IF NOT EXISTS override_source text;

UPDATE public.pricelist_line_overrides
SET override_source = CASE
  WHEN reason = 'Bulk markup/discount adjustment' THEN 'bulk_adjustment'
  ELSE 'manual'
END
WHERE override_source IS NULL;

ALTER TABLE public.pricelist_line_overrides
  ALTER COLUMN override_source SET DEFAULT 'manual',
  ALTER COLUMN override_source SET NOT NULL;

ALTER TABLE public.pricelist_line_overrides
  DROP CONSTRAINT IF EXISTS pricelist_line_overrides_override_source_check;

ALTER TABLE public.pricelist_line_overrides
  ADD CONSTRAINT pricelist_line_overrides_override_source_check
  CHECK (override_source IN ('manual', 'bulk_adjustment'));

COMMENT ON COLUMN public.pricelist_line_overrides.override_source IS
  'manual for operator-entered prices; bulk_adjustment for generated markup/discount rows.';

DROP FUNCTION IF EXISTS public.materialize_pricelist_adjustments(
  integer, text, text, boolean, text, numeric, numeric, numeric, numeric, jsonb
);

CREATE FUNCTION public.materialize_pricelist_adjustments(
  p_version_id integer,
  p_name text,
  p_base_currency text,
  p_is_template boolean,
  p_format_type text,
  p_markup_percent numeric,
  p_discount_percent numeric,
  p_master_markup_percent numeric,
  p_master_discount_percent numeric,
  p_child_adjustments jsonb,
  p_replace_manual boolean DEFAULT false
)
RETURNS TABLE(
  section_type text,
  applied_count integer,
  removed_count integer,
  preserved_manual_count integer
)
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
  v_inserted integer;
  v_applied integer;
  v_removed integer;
  v_preserved integer;
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
    v_section_id := NULL;

    SELECT pcs.id
    INTO v_section_id
    FROM public.pricelist_child_sections pcs
    WHERE pcs.pricelist_version_id = p_version_id
      AND pcs.section_type = v_section_type
    ORDER BY pcs.id
    LIMIT 1
    FOR UPDATE;

    IF v_section_id IS NULL THEN
      INSERT INTO public.pricelist_child_sections (
        pricelist_version_id, section_type, child_markup_percent, child_discount_percent
      ) VALUES (
        p_version_id, v_section_type, v_child_markup, v_child_discount
      ) RETURNING id INTO v_section_id;
    ELSE
      UPDATE public.pricelist_child_sections pcs
      SET child_markup_percent = v_child_markup,
          child_discount_percent = v_child_discount,
          updated_at = now()
      WHERE pcs.id = v_section_id;
    END IF;

    SELECT CASE WHEN p_replace_manual THEN 0 ELSE count(*)::integer END
    INTO v_preserved
    FROM public.pricelist_line_overrides plo
    JOIN public.pricelist_child_sections pcs ON pcs.id = plo.child_section_id
    WHERE pcs.pricelist_version_id = p_version_id
      AND pcs.section_type = v_section_type
      AND plo.override_source = 'manual';

    DELETE FROM public.pricelist_line_overrides plo
    USING public.pricelist_child_sections pcs
    WHERE pcs.id = plo.child_section_id
      AND pcs.pricelist_version_id = p_version_id
      AND pcs.section_type = v_section_type
      AND (p_replace_manual OR plo.override_source = 'bulk_adjustment');
    GET DIAGNOSTICS v_removed = ROW_COUNT;

    v_factor := (1 + COALESCE(p_master_markup_percent, 0) / 100)
      * (1 - COALESCE(p_master_discount_percent, 0) / 100)
      * (1 + v_child_markup / 100)
      * (1 - v_child_discount / 100);
    v_applied := 0;

    IF v_section_type = 'RX Lens Prices' THEN
      INSERT INTO public.pricelist_line_overrides (
        child_section_id, reference_type, reference_id, overridden_price_bbd, reason, override_source
      )
      SELECT v_section_id, 'matrix_allocation', ma.id::text,
             round(ma.allocated_price_bbd * v_factor, 2),
             'Bulk markup/discount adjustment', 'bulk_adjustment'
      FROM public.matrix_allocations ma
      WHERE ma.pricelist_version_id = p_version_id
        AND ma.is_active IS NOT FALSE
        AND ma.allocated_price_bbd IS NOT NULL
        AND round(ma.allocated_price_bbd * v_factor, 2) <> ma.allocated_price_bbd
        AND NOT EXISTS (
          SELECT 1
          FROM public.pricelist_line_overrides manual_override
          JOIN public.pricelist_child_sections manual_section
            ON manual_section.id = manual_override.child_section_id
          WHERE manual_section.pricelist_version_id = p_version_id
            AND manual_section.section_type = v_section_type
            AND manual_override.reference_type = 'matrix_allocation'
            AND manual_override.reference_id = ma.id::text
            AND manual_override.override_source = 'manual'
        );
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      v_applied := v_applied + v_inserted;

      INSERT INTO public.pricelist_line_overrides (
        child_section_id, reference_type, reference_id, overridden_price_bbd, reason, override_source
      )
      SELECT v_section_id, r.row_type, r.item_id::text,
             round(r.bbd_price * v_factor, 2),
             'Bulk markup/discount adjustment', 'bulk_adjustment'
      FROM public.pricelist_catalog_rows r
      WHERE r.pricelist_version_id = p_version_id
        AND r.catalog_type = 'rx'
        AND r.row_type IN ('addon', 'treatment', 'supply')
        AND r.item_id IS NOT NULL
        AND r.bbd_price IS NOT NULL
        AND round(r.bbd_price * v_factor, 2) <> r.bbd_price
        AND NOT EXISTS (
          SELECT 1
          FROM public.pricelist_line_overrides manual_override
          JOIN public.pricelist_child_sections manual_section
            ON manual_section.id = manual_override.child_section_id
          WHERE manual_section.pricelist_version_id = p_version_id
            AND manual_section.section_type = v_section_type
            AND manual_override.reference_type = r.row_type
            AND manual_override.reference_id = r.item_id::text
            AND manual_override.override_source = 'manual'
        );
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
      v_applied := v_applied + v_inserted;
    ELSIF v_section_type = 'Stock Lens Prices' THEN
      INSERT INTO public.pricelist_line_overrides (
        child_section_id, reference_type, reference_id, overridden_price_bbd, reason, override_source
      )
      SELECT v_section_id, r.row_type, r.item_id::text,
             round(r.bbd_price * v_factor, 2),
             'Bulk markup/discount adjustment', 'bulk_adjustment'
      FROM public.pricelist_catalog_rows r
      WHERE r.pricelist_version_id = p_version_id
        AND r.catalog_type = 'stock'
        AND r.item_id IS NOT NULL
        AND r.bbd_price IS NOT NULL
        AND round(r.bbd_price * v_factor, 2) <> r.bbd_price
        AND NOT EXISTS (
          SELECT 1
          FROM public.pricelist_line_overrides manual_override
          JOIN public.pricelist_child_sections manual_section
            ON manual_section.id = manual_override.child_section_id
          WHERE manual_section.pricelist_version_id = p_version_id
            AND manual_section.section_type = v_section_type
            AND manual_override.reference_type = r.row_type
            AND manual_override.reference_id = r.item_id::text
            AND manual_override.override_source = 'manual'
        );
      GET DIAGNOSTICS v_applied = ROW_COUNT;
    ELSE
      INSERT INTO public.pricelist_line_overrides (
        child_section_id, reference_type, reference_id, overridden_price_bbd, reason, override_source
      )
      SELECT v_section_id, r.row_type, r.item_id::text,
             round(r.bbd_price * v_factor, 2),
             'Bulk markup/discount adjustment', 'bulk_adjustment'
      FROM public.pricelist_catalog_rows r
      WHERE r.pricelist_version_id = p_version_id
        AND r.catalog_type = 'buysell'
        AND r.item_id IS NOT NULL
        AND r.bbd_price IS NOT NULL
        AND round(r.bbd_price * v_factor, 2) <> r.bbd_price
        AND NOT EXISTS (
          SELECT 1
          FROM public.pricelist_line_overrides manual_override
          JOIN public.pricelist_child_sections manual_section
            ON manual_section.id = manual_override.child_section_id
          WHERE manual_section.pricelist_version_id = p_version_id
            AND manual_section.section_type = v_section_type
            AND manual_override.reference_type = r.row_type
            AND manual_override.reference_id = r.item_id::text
            AND manual_override.override_source = 'manual'
        );
      GET DIAGNOSTICS v_applied = ROW_COUNT;
    END IF;

    section_type := v_section_type;
    applied_count := v_applied;
    removed_count := v_removed;
    preserved_manual_count := v_preserved;
    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.materialize_pricelist_adjustments(
  integer, text, text, boolean, text, numeric, numeric, numeric, numeric, jsonb, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.materialize_pricelist_adjustments(
  integer, text, text, boolean, text, numeric, numeric, numeric, numeric, jsonb, boolean
) TO authenticated;

NOTIFY pgrst, 'reload schema';
