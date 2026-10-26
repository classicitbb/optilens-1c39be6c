-- Build the allowlisted snapshot once instead of concatenating one large JSON array per SKU.
CREATE OR REPLACE FUNCTION clearance_private.validated_snapshot(p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE item jsonb; clean_items jsonb := '[]'::jsonb; single_vision boolean; source_time timestamptz; expiry timestamptz; field text;
BEGIN
  IF jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' OR p_snapshot->>'currency' IS DISTINCT FROM 'BBD'
     OR jsonb_typeof(p_snapshot->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_snapshot->'items') > 20000 THEN
    RAISE EXCEPTION 'Invalid clearance snapshot' USING ERRCODE='22023';
  END IF;
  source_time := (p_snapshot->>'asOf')::timestamptz;
  expiry := (p_snapshot->>'expiresAt')::timestamptz;
  IF source_time IS NULL OR expiry IS NULL OR source_time > now()+interval '5 minutes'
     OR expiry <= now() OR expiry <= source_time OR expiry > source_time+interval '24 hours' THEN
    RAISE EXCEPTION 'Invalid snapshot freshness' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_snapshot->'items') LOOP
    FOREACH field IN ARRAY ARRAY['name','material','manufacturer','family','design','option'] LOOP
      IF jsonb_typeof(item->field) IS DISTINCT FROM 'string' OR length(item->>field) NOT BETWEEN 1 AND 500 THEN
        RAISE EXCEPTION 'Invalid lens identity' USING ERRCODE='22023';
      END IF;
    END LOOP;
    single_vision := item->>'family' = 'Single Vision';
    IF NOT single_vision AND item->>'family' NOT IN ('Progressive','Bifocal','Trifocal','Double Segs') THEN
      RAISE EXCEPTION 'Unsupported lens family' USING ERRCODE='22023';
    END IF;
    IF item->>'unit' IS DISTINCT FROM (CASE WHEN single_vision THEN 'each' ELSE 'pairs' END)
       OR item->>'verticalAxis' IS DISTINCT FROM (CASE WHEN single_vision THEN 'Sphere' ELSE 'Base curve' END)
       OR item->>'horizontalAxis' IS DISTINCT FROM (CASE WHEN single_vision THEN 'Cylinder' ELSE 'Add' END) THEN
      RAISE EXCEPTION 'Invalid sale unit' USING ERRCODE='22023';
    END IF;
    FOREACH field IN ARRAY ARRAY['quantity','priceBbd','diameter','base','addPower'] LOOP
      IF jsonb_typeof(item->field) IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'Invalid optical value' USING ERRCODE='22023';
      END IF;
    END LOOP;
    IF (item->>'quantity')::numeric <= 0 OR trunc((item->>'quantity')::numeric) <> (item->>'quantity')::numeric
       OR (item->>'quantity')::numeric > 9007199254740991 OR (item->>'priceBbd')::numeric <= 0
       OR round((item->>'priceBbd')::numeric,2) <> (item->>'priceBbd')::numeric OR (item->>'diameter')::numeric <= 0 THEN
      RAISE EXCEPTION 'Invalid sale quantity or price' USING ERRCODE='22023';
    END IF;
  END LOOP;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'sku',left(COALESCE(entry->>'sku',''),500),'skuRight',left(COALESCE(entry->>'skuRight',''),500),
      'skuLeft',left(COALESCE(entry->>'skuLeft',''),500),'description',left(COALESCE(entry->>'description',''),500),
      'name',entry->'name','material',entry->'material','manufacturer',entry->'manufacturer','family',entry->'family',
      'design',entry->'design','option',entry->'option','diameter',entry->'diameter','base',entry->'base',
      'addPower',entry->'addPower','verticalAxis',entry->'verticalAxis','horizontalAxis',entry->'horizontalAxis',
      'unit',entry->'unit','quantity',entry->'quantity','priceBbd',entry->'priceBbd')),'[]'::jsonb) INTO clean_items
    FROM jsonb_array_elements(p_snapshot->'items') AS entries(entry);
  RETURN jsonb_build_object('currency','BBD','asOf',p_snapshot->'asOf','expiresAt',p_snapshot->'expiresAt','items',clean_items);
END;
$$;
