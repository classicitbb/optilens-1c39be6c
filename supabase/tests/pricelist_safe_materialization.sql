BEGIN;

SELECT plan(1);

CREATE OR REPLACE FUNCTION public.has_edit_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT current_setting('test.has_edit_role', true) = 'true' $$;

DO $$
DECLARE
  v_version_id integer;
  v_section_id integer;
  v_manual_ref uuid := gen_random_uuid();
  v_generated_ref uuid := gen_random_uuid();
  v_before_name text;
BEGIN
  PERFORM set_config('test.has_edit_role', 'true', true);

  INSERT INTO public.pricelist_versions (name, base_currency, format_type)
  VALUES ('Safe materialization test', 'BBD', 'list')
  RETURNING id INTO v_version_id;

  INSERT INTO public.pricelist_child_sections (
    pricelist_version_id, section_type, child_markup_percent, child_discount_percent
  ) VALUES (v_version_id, 'Stock Lens Prices', 0, 0)
  RETURNING id INTO v_section_id;

  INSERT INTO public.pricelist_catalog_rows (
    pricelist_version_id, catalog_type, row_key, row_type, section,
    display_description, bbd_price, item_id
  ) VALUES
    (v_version_id, 'stock', 'manual-row', 'lens', 'Stock', 'Manual row', 100, v_manual_ref),
    (v_version_id, 'stock', 'generated-row', 'lens', 'Stock', 'Generated row', 200, v_generated_ref);

  INSERT INTO public.pricelist_line_overrides (
    child_section_id, reference_type, reference_id, overridden_price_bbd, reason, override_source
  ) VALUES
    (v_section_id, 'lens', v_manual_ref::text, 123.45, 'Operator edit', 'manual'),
    (v_section_id, 'lens', v_generated_ref::text, 210, 'Bulk markup/discount adjustment', 'bulk_adjustment');

  -- Metadata-only updates do not call materialization and cannot touch lines.
  UPDATE public.pricelist_versions SET name = 'Renamed only' WHERE id = v_version_id;
  IF (SELECT count(*) FROM public.pricelist_line_overrides WHERE child_section_id = v_section_id) <> 2 THEN
    RAISE EXCEPTION 'metadata-only update changed overrides';
  END IF;

  -- A 0% reset removes generated rows only.
  PERFORM * FROM public.materialize_pricelist_adjustments(
    v_version_id, 'Zero reset', 'BBD', false, 'list', 0, 0, 0, 0,
    '{"RX Lens Prices":{"markup":0,"discount":0},"Stock Lens Prices":{"markup":0,"discount":0},"Supplies Prices":{"markup":0,"discount":0}}'::jsonb,
    false
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.pricelist_line_overrides
    WHERE child_section_id = v_section_id AND reference_id = v_manual_ref::text
      AND overridden_price_bbd = 123.45 AND override_source = 'manual'
  ) OR EXISTS (
    SELECT 1 FROM public.pricelist_line_overrides
    WHERE child_section_id = v_section_id AND override_source = 'bulk_adjustment'
  ) THEN
    RAISE EXCEPTION '0 percent reset did not preserve manual/remove generated rows';
  END IF;

  -- Regeneration skips the manual key and creates only the other generated row.
  PERFORM * FROM public.materialize_pricelist_adjustments(
    v_version_id, 'Ten percent', 'BBD', false, 'list', 0, 0, 0, 0,
    '{"RX Lens Prices":{"markup":0,"discount":0},"Stock Lens Prices":{"markup":10,"discount":0},"Supplies Prices":{"markup":0,"discount":0}}'::jsonb,
    false
  );
  IF (SELECT count(*) FROM public.pricelist_line_overrides WHERE reference_id = v_manual_ref::text) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.pricelist_line_overrides
       WHERE reference_id = v_generated_ref::text AND overridden_price_bbd = 220
         AND override_source = 'bulk_adjustment'
     ) THEN
    RAISE EXCEPTION 'generated replacement did not preserve the manual key';
  END IF;

  -- Explicit replace-all removes the manual value and materializes both keys.
  PERFORM * FROM public.materialize_pricelist_adjustments(
    v_version_id, 'Replace all', 'BBD', false, 'list', 0, 0, 0, 0,
    '{"RX Lens Prices":{"markup":0,"discount":0},"Stock Lens Prices":{"markup":5,"discount":0},"Supplies Prices":{"markup":0,"discount":0}}'::jsonb,
    true
  );
  IF EXISTS (
    SELECT 1 FROM public.pricelist_line_overrides
    WHERE reference_id = v_manual_ref::text AND override_source = 'manual'
  ) OR (SELECT count(*) FROM public.pricelist_line_overrides WHERE child_section_id = v_section_id) <> 2 THEN
    RAISE EXCEPTION 'replace-all did not replace every in-scope override';
  END IF;

  -- A failure after the version update rolls the whole function statement back.
  SELECT name INTO v_before_name FROM public.pricelist_versions WHERE id = v_version_id;
  BEGIN
    PERFORM * FROM public.materialize_pricelist_adjustments(
      v_version_id, 'Must roll back', 'BBD', false, 'list', 0, 0, 0, 0,
      '{"Stock Lens Prices":{"markup":"not-a-number","discount":0}}'::jsonb,
      false
    );
    RAISE EXCEPTION 'invalid adjustment unexpectedly succeeded';
  EXCEPTION WHEN invalid_text_representation THEN
    NULL;
  END;
  IF (SELECT name FROM public.pricelist_versions WHERE id = v_version_id) <> v_before_name THEN
    RAISE EXCEPTION 'failed materialization did not roll back metadata';
  END IF;

  -- Authorization rejects the call before changing metadata or rows.
  PERFORM set_config('test.has_edit_role', 'false', true);
  BEGIN
    PERFORM * FROM public.materialize_pricelist_adjustments(
      v_version_id, 'Unauthorized change', 'BBD', false, 'list', 0, 0, 0, 0,
      '{}'::jsonb, false
    );
    RAISE EXCEPTION 'unauthorized materialization unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'unauthorized materialization unexpectedly succeeded' THEN RAISE; END IF;
  END;
  IF (SELECT name FROM public.pricelist_versions WHERE id = v_version_id) <> v_before_name THEN
    RAISE EXCEPTION 'unauthorized materialization changed metadata';
  END IF;
END;
$$;

SELECT pass('pricelist materialization preserves manual prices and remains atomic');
SELECT * FROM finish();

ROLLBACK;
