CREATE OR REPLACE FUNCTION public.crm_merge_ref_allowed(p_table text, p_column text)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT p_table IS NOT NULL AND p_column IS NOT NULL AND EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f' AND c.confrelid = 'public.contacts'::regclass
      AND c.conrelid::regclass::text = p_table AND a.attname::text = p_column)
$$;
REVOKE EXECUTE ON FUNCTION public.crm_merge_ref_allowed(text, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.crm_unmerge_contacts(p_log_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_log public.contact_merge_log%ROWTYPE;
  v_item jsonb;
  v_f jsonb;
  v_d jsonb;
  v_key record;
  v_where text;
  v_restored integer := 0;
  v_skipped integer := 0;
  v_n integer;
BEGIN
  IF NOT public.has_edit_role(v_uid) THEN
    RAISE EXCEPTION 'CRM edit access required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_log FROM public.contact_merge_log WHERE id = p_log_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Merge log not found' USING ERRCODE = 'P0002'; END IF;
  IF v_log.undone_at IS NOT NULL THEN RAISE EXCEPTION 'Already undone' USING ERRCODE = '22023'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_log.moved) LOOP
    IF NOT COALESCE((v_item ->> 'undoable')::boolean, false) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    IF NOT public.crm_merge_ref_allowed(v_item ->> 'table', v_item ->> 'column') THEN
      RAISE EXCEPTION 'Merge log references an unexpected table or column' USING ERRCODE = '42501';
    END IF;
    v_where := '';
    FOR v_key IN SELECT k FROM jsonb_object_keys(v_item -> 'pk') AS k LOOP
      v_where := v_where || CASE WHEN v_where = '' THEN '' ELSE ' AND ' END ||
        format('%1$I::text = ($2 ->> %2$L)', v_key.k, v_key.k);
    END LOOP;
    EXECUTE format('UPDATE %s SET %I = $1 WHERE %I::text = $3::text AND %s',
      v_item ->> 'table', v_item ->> 'column', v_item ->> 'column', v_where)
      USING v_log.dropped_id, v_item -> 'pk', v_log.kept_id::text;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN v_restored := v_restored + 1; ELSE v_skipped := v_skipped + 1; END IF;
  END LOOP;

  FOR v_d IN SELECT * FROM jsonb_array_elements(v_log.discarded) LOOP
    IF (v_d ->> 'table') IS NULL OR (v_d ->> 'table') NOT IN ('contact_tag_links', 'cadence_enrollments', 'campaign_activation_profiles',
        'public.contact_tag_links', 'public.cadence_enrollments', 'public.campaign_activation_profiles') THEN
      RAISE EXCEPTION 'Merge log references an unexpected table' USING ERRCODE = '42501';
    END IF;
    BEGIN
      EXECUTE format('INSERT INTO %s SELECT * FROM jsonb_populate_record(NULL::%s, $1)', v_d ->> 'table', v_d ->> 'table')
        USING v_d -> 'row';
      v_restored := v_restored + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  FOR v_f IN SELECT * FROM jsonb_array_elements(v_log.filled) LOOP
    IF (v_f ->> 'column') = 'is_customer' THEN
      UPDATE public.contacts SET is_customer = false WHERE id = v_log.kept_id AND is_customer IS TRUE;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.contacts'::regclass
                     AND attname = (v_f ->> 'column') AND attnum > 0 AND NOT attisdropped) THEN
        RAISE EXCEPTION 'Merge log references an unexpected column' USING ERRCODE = '42501';
      END IF;
      EXECUTE format(
        'UPDATE public.contacts SET %1$I = (jsonb_populate_record(NULL::public.contacts, $2)).%1$I
          WHERE id = $1 AND %1$I::text IS NOT DISTINCT FROM $3',
        v_f ->> 'column')
        USING v_log.kept_id, jsonb_build_object(v_f ->> 'column', v_f -> 'before'), v_f ->> 'after';
      EXECUTE format(
        'UPDATE public.contacts SET %1$I = (jsonb_populate_record(NULL::public.contacts, $2)).%1$I
          WHERE id = $1 AND %1$I IS NULL',
        v_f ->> 'column')
        USING v_log.dropped_id, jsonb_build_object(v_f ->> 'column', v_log.dropped_before -> (v_f ->> 'column'));
    END IF;
  END LOOP;

  UPDATE public.contacts SET is_archived = false WHERE id = v_log.dropped_id;

  UPDATE public.contact_merge_log SET undone_at = now(), undone_by = v_uid WHERE id = p_log_id;

  RETURN jsonb_build_object('restored', v_restored, 'not_restored', v_skipped);
END;
$function$
;
REVOKE EXECUTE ON FUNCTION public.apply_contact_enrichment(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_contact_enrichment(uuid, uuid[]) TO service_role;