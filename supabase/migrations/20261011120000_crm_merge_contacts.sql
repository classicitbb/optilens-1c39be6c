-- CRM data health: merge two contact records into one, atomically and reversibly.
--
-- crm_merge_contacts(keep, drop, dry_run):
--   * moves every row that references the dropped contact onto the kept one (all
--     single-column foreign keys to contacts(id) are discovered at run time, so new
--     tables are covered automatically; profiles.crm_contact_id has no FK and is listed)
--   * fills BLANK fields on the kept contact from the dropped one; never overwrites a
--     populated field. Fields where both sides hold different values are reported as
--     conflicts and left untouched
--   * archives the dropped contact (no delete), adds a note on the kept contact
--   * writes contact_merge_log with a before-image of everything it changed
--   * dry_run => runs the same code path, then rolls back and returns the report
-- crm_unmerge_contacts(log_id) reverses a merge from that log.
--
-- Refuses: same record, archived record, person-into-company, two different ERP
-- customer links. Only editors may run it. Apply via the Lovable SQL editor.

CREATE TABLE IF NOT EXISTS public.contact_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kept_id uuid NOT NULL,
  dropped_id uuid NOT NULL,
  merged_by uuid,
  merged_at timestamptz NOT NULL DEFAULT now(),
  moved jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{table, column, pk, undoable}]
  discarded jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{table, row}] duplicates dropped on a unique clash
  filled jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{column, before, after}] on the kept contact
  conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{column, kept, dropped}] left as they were
  kept_before jsonb,
  dropped_before jsonb,
  undone_at timestamptz,
  undone_by uuid
);
CREATE INDEX IF NOT EXISTS contact_merge_log_kept_idx ON public.contact_merge_log (kept_id);
CREATE INDEX IF NOT EXISTS contact_merge_log_dropped_idx ON public.contact_merge_log (dropped_id);
ALTER TABLE public.contact_merge_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Role users can read contact merge log" ON public.contact_merge_log;
CREATE POLICY "Role users can read contact merge log"
  ON public.contact_merge_log FOR SELECT TO authenticated
  USING (public.has_any_role((select auth.uid())));

CREATE OR REPLACE FUNCTION public.crm_merge_contacts(
  p_keep uuid,
  p_drop uuid,
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_keep public.contacts%ROWTYPE;
  v_drop public.contacts%ROWTYPE;
  v_keep_j jsonb;
  v_drop_j jsonb;
  v_ref record;
  v_col record;
  v_row record;
  v_pkcols text[];
  v_pk jsonb;
  v_n integer;
  v_moved jsonb := '[]'::jsonb;
  v_discarded jsonb := '[]'::jsonb;
  v_filled jsonb := '[]'::jsonb;
  v_conflicts jsonb := '[]'::jsonb;
  v_counts jsonb := '{}'::jsonb;
  v_unique_cols text[];
  v_kv text;
  v_dv text;
  v_log_id uuid;
  v_report jsonb;
  -- tables where a unique clash means "the kept contact already has this" and the
  -- dropped contact's row can safely be discarded (its image is kept in the log)
  v_discardable text[] := ARRAY['contact_tag_links', 'cadence_enrollments', 'campaign_activation_profiles'];
BEGIN
  IF NOT public.has_edit_role(v_uid) THEN
    RAISE EXCEPTION 'CRM edit access required' USING ERRCODE = '42501';
  END IF;
  IF p_keep IS NULL OR p_drop IS NULL OR p_keep = p_drop THEN
    RAISE EXCEPTION 'Choose two different contacts' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('crm_merge:' || least(p_keep, p_drop)::text || greatest(p_keep, p_drop)::text));

  SELECT * INTO v_keep FROM public.contacts WHERE id = p_keep FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kept contact not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_drop FROM public.contacts WHERE id = p_drop FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Merged contact not found' USING ERRCODE = 'P0002'; END IF;

  IF COALESCE(v_keep.is_archived, false) OR COALESCE(v_drop.is_archived, false) THEN
    RAISE EXCEPTION 'Both contacts must be active (not archived)' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(v_keep.is_company, false) <> COALESCE(v_drop.is_company, false) THEN
    RAISE EXCEPTION 'Cannot merge a company with a person; link them with parent_id instead' USING ERRCODE = '22023';
  END IF;
  IF v_keep.linked_customer_id IS NOT NULL AND v_drop.linked_customer_id IS NOT NULL
     AND v_keep.linked_customer_id <> v_drop.linked_customer_id THEN
    RAISE EXCEPTION 'These contacts belong to different ERP customers (% and %)',
      v_keep.linked_customer_id, v_drop.linked_customer_id USING ERRCODE = '22023';
  END IF;

  v_keep_j := to_jsonb(v_keep);
  v_drop_j := to_jsonb(v_drop);

  BEGIN  -- everything below can be rolled back for a dry run
    -- Hierarchy: never leave a contact as its own parent.
    IF v_keep.parent_id = p_drop THEN
      UPDATE public.contacts SET parent_id = v_drop.parent_id WHERE id = p_keep;
    END IF;
    IF v_drop.parent_id = p_keep THEN
      UPDATE public.contacts SET parent_id = NULL WHERE id = p_drop;
    END IF;

    -- 1. Repoint every reference.
    FOR v_ref IN
      SELECT c.conrelid::regclass::text AS tbl, a.attname::text AS col
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       WHERE c.contype = 'f'
         AND c.confrelid = 'public.contacts'::regclass
         AND array_length(c.conkey, 1) = 1
      UNION
      SELECT 'public.' || table_name, column_name::text
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'crm_contact_id'
    LOOP
      SELECT array_agg(a.attname::text) INTO v_pkcols
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
       WHERE i.indrelid = v_ref.tbl::regclass AND i.indisprimary;

      v_n := 0;
      FOR v_row IN EXECUTE format(
        'SELECT ctid AS cid, to_jsonb(t) AS img FROM %s t WHERE %I::text = $1::text', v_ref.tbl, v_ref.col
      ) USING p_drop
      LOOP
        v_pk := NULL;
        IF v_pkcols IS NOT NULL THEN
          SELECT jsonb_object_agg(k, v) INTO v_pk FROM jsonb_each(v_row.img) AS e(k, v) WHERE k = ANY (v_pkcols);
        END IF;
        BEGIN
          EXECUTE format('UPDATE %s SET %I = $1 WHERE ctid = $2', v_ref.tbl, v_ref.col) USING p_keep, v_row.cid;
          GET DIAGNOSTICS v_n = ROW_COUNT;
          IF v_n > 0 THEN
            v_moved := v_moved || jsonb_build_array(jsonb_build_object(
              'table', v_ref.tbl, 'column', v_ref.col, 'pk', v_pk, 'undoable', v_pk IS NOT NULL));
            v_counts := jsonb_set(v_counts, ARRAY[v_ref.tbl || '.' || v_ref.col],
              to_jsonb(COALESCE((v_counts ->> (v_ref.tbl || '.' || v_ref.col))::int, 0) + 1));
          END IF;
        EXCEPTION WHEN unique_violation THEN
          IF replace(v_ref.tbl, 'public.', '') = ANY (v_discardable) THEN
            EXECUTE format('DELETE FROM %s WHERE ctid = $1', v_ref.tbl) USING v_row.cid;
            v_discarded := v_discarded || jsonb_build_array(jsonb_build_object('table', v_ref.tbl, 'row', v_row.img));
          ELSE
            RAISE EXCEPTION 'Cannot move % rows: the kept contact already has a conflicting record in %. Resolve it by hand first.',
              v_ref.tbl, v_ref.tbl USING ERRCODE = '23505';
          END IF;
        END;
      END LOOP;
    END LOOP;

    -- 2. Fill blanks on the kept contact. Single-column unique indexes (other than
    --    name) must be released on the dropped row first.
    SELECT array_agg(a.attname::text) INTO v_unique_cols
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
     WHERE i.indrelid = 'public.contacts'::regclass AND i.indisunique AND NOT i.indisprimary AND i.indnatts = 1;

    FOR v_col IN
      SELECT column_name::text AS col
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'contacts'
         AND is_generated = 'NEVER'
         AND data_type IN ('text', 'character varying', 'integer', 'bigint', 'smallint', 'numeric', 'date', 'timestamp with time zone')
         AND column_name NOT IN ('id', 'name', 'parent_id', 'created_at', 'updated_at', 'stage_entered_at', 'next_action_at')
    LOOP
      v_kv := v_keep_j ->> v_col.col;
      v_dv := v_drop_j ->> v_col.col;
      IF v_dv IS NULL OR btrim(v_dv) = '' THEN CONTINUE; END IF;
      IF v_kv IS NULL OR btrim(v_kv) = '' THEN
        IF v_unique_cols IS NOT NULL AND v_col.col = ANY (v_unique_cols) THEN
          EXECUTE format('UPDATE public.contacts SET %I = NULL WHERE id = $1', v_col.col) USING p_drop;
        END IF;
        EXECUTE format(
          'UPDATE public.contacts SET %1$I = (jsonb_populate_record(NULL::public.contacts, $2)).%1$I WHERE id = $1', v_col.col
        ) USING p_keep, jsonb_build_object(v_col.col, v_drop_j -> v_col.col);
        v_filled := v_filled || jsonb_build_array(jsonb_build_object(
          'column', v_col.col, 'before', v_keep_j -> v_col.col, 'after', v_drop_j -> v_col.col));
      ELSIF lower(btrim(v_kv)) <> lower(btrim(v_dv)) THEN
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'column', v_col.col, 'kept', v_keep_j -> v_col.col, 'dropped', v_drop_j -> v_col.col));
      END IF;
    END LOOP;

    IF COALESCE(v_drop.is_customer, false) AND NOT COALESCE(v_keep.is_customer, false) THEN
      UPDATE public.contacts SET is_customer = true WHERE id = p_keep;
      v_filled := v_filled || jsonb_build_array(jsonb_build_object('column', 'is_customer', 'before', false, 'after', true));
    END IF;

    -- 3. Archive the duplicate and leave a trail on the survivor.
    UPDATE public.contacts SET is_archived = true WHERE id = p_drop;
    INSERT INTO public.notes (contact_id, content)
    VALUES (p_keep, 'Merged duplicate record "' || COALESCE(v_drop.name, '') || '" into this contact.');

    INSERT INTO public.contact_merge_log (
      kept_id, dropped_id, merged_by, moved, discarded, filled, conflicts, kept_before, dropped_before
    ) VALUES (
      p_keep, p_drop, v_uid, v_moved, v_discarded, v_filled, v_conflicts, v_keep_j, v_drop_j
    ) RETURNING id INTO v_log_id;

    v_report := jsonb_build_object(
      'dry_run', p_dry_run, 'log_id', CASE WHEN p_dry_run THEN NULL ELSE v_log_id END,
      'kept', jsonb_build_object('id', p_keep, 'name', v_keep.name),
      'dropped', jsonb_build_object('id', p_drop, 'name', v_drop.name),
      'moved', v_counts,
      'discarded_duplicates', jsonb_array_length(v_discarded),
      'filled', v_filled,
      'conflicts', v_conflicts
    );

    IF p_dry_run THEN
      RAISE EXCEPTION 'dry run' USING ERRCODE = 'CM001';
    END IF;
  EXCEPTION WHEN SQLSTATE 'CM001' THEN
    NULL;  -- v_report survives the rollback of this block
  END;

  RETURN v_report;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_unmerge_contacts(p_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Moved rows go back by primary key. Rows without one are reported, not guessed.
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_log.moved) LOOP
    IF NOT COALESCE((v_item ->> 'undoable')::boolean, false) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
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

  -- Rows discarded on a unique clash are re-created.
  FOR v_d IN SELECT * FROM jsonb_array_elements(v_log.discarded) LOOP
    BEGIN
      EXECUTE format('INSERT INTO %s SELECT * FROM jsonb_populate_record(NULL::%s, $1)', v_d ->> 'table', v_d ->> 'table')
        USING v_d -> 'row';
      v_restored := v_restored + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  -- Fields that were filled go back to blank only if they still hold the filled value.
  FOR v_f IN SELECT * FROM jsonb_array_elements(v_log.filled) LOOP
    IF (v_f ->> 'column') = 'is_customer' THEN
      UPDATE public.contacts SET is_customer = false WHERE id = v_log.kept_id AND is_customer IS TRUE;
    ELSE
      EXECUTE format(
        'UPDATE public.contacts SET %1$I = (jsonb_populate_record(NULL::public.contacts, $2)).%1$I
          WHERE id = $1 AND %1$I::text IS NOT DISTINCT FROM $3',
        v_f ->> 'column')
        USING v_log.kept_id, jsonb_build_object(v_f ->> 'column', v_f -> 'before'), v_f ->> 'after';
      -- A value released on the dropped row (unique identifiers) comes back with it.
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
$$;

REVOKE ALL ON FUNCTION public.crm_merge_contacts(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_unmerge_contacts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_merge_contacts(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_unmerge_contacts(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
