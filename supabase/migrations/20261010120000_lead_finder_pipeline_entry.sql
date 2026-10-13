-- Lead Finder save: put new prospects on the pipeline board at Target, and recognise
-- a company as a customer when the people under it carry the ERP link (the link is
-- on the person rows, not the company row). Re-creates lead_finder_save_lead only;
-- grants from 20261007150000 are kept. Apply live via the Lovable SQL editor.

CREATE OR REPLACE FUNCTION public.lead_finder_save_lead(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_identity jsonb := p_payload->'identity';
  v_lead jsonb := COALESCE(p_payload->'lead', '{}'::jsonb);
  v_identity_id uuid;
  v_name text;
  v_contact_id uuid := NULLIF(p_payload->>'contact_id', '')::uuid;
  v_created_contact boolean := false;
  v_is_customer boolean := false;
  v_review public.lead_discovery_reviews%ROWTYPE;
  v_live public.lead_discovery_links%ROWTYPE;
  v_opportunity_id uuid;
  v_note_id uuid;
  v_task_id uuid;
  v_strength text := COALESCE(NULLIF(p_payload->>'connection_strength', ''), 'unclassified');
  v_follow boolean := COALESCE((p_payload->>'needs_follow_up')::boolean, false);
  v_owner uuid := COALESCE(NULLIF(p_payload->>'follow_up_owner', '')::uuid, auth.uid());
  v_due timestamptz := NULLIF(p_payload->>'follow_up_due_at', '')::timestamptz;
  v_score numeric := NULLIF(v_lead->>'score', '')::numeric;
BEGIN
  IF NOT public.has_edit_role(v_uid) THEN
    RAISE EXCEPTION 'CRM edit access required' USING ERRCODE = '42501';
  END IF;
  IF v_identity IS NULL THEN
    RAISE EXCEPTION 'identity is required' USING ERRCODE = '22023';
  END IF;
  IF v_strength NOT IN ('unclassified', 'strong', 'not_strong') THEN
    RAISE EXCEPTION 'Invalid connection strength' USING ERRCODE = '22023';
  END IF;

  v_name := BTRIM(v_identity->>'display_name');

  -- Serialises concurrent saves of the same business.
  PERFORM pg_advisory_xact_lock(hashtext('lead_finder:' || COALESCE(v_identity->>'identity_key', '')));
  v_identity_id := public.lead_finder_touch_identity(v_identity);

  SELECT * INTO v_review FROM public.lead_discovery_reviews WHERE identity_id = v_identity_id;
  SELECT * INTO v_live FROM public.lead_discovery_links
   WHERE identity_id = v_identity_id AND revoked_at IS NULL;

  -- Target resolution: explicit choice, then confirmed link, then earlier save.
  IF v_contact_id IS NULL AND v_live.link_kind = 'contact' THEN
    v_contact_id := v_live.contact_id;
  END IF;
  IF v_contact_id IS NULL THEN
    v_contact_id := v_review.contact_id;
  END IF;
  IF v_contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = v_contact_id) THEN
    RAISE EXCEPTION 'Contact not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_contact_id IS NULL THEN
    -- contacts.name is unique; never silently reuse or overwrite another record.
    IF EXISTS (SELECT 1 FROM public.contacts WHERE name = v_name) THEN
      RAISE EXCEPTION 'A CRM contact named "%" already exists. Link it instead of saving a new one.', v_name
        USING ERRCODE = '23505', HINT = 'name_conflict';
    END IF;

    INSERT INTO public.contacts (
      name, country, city, website, instagram_handle, facebook_page_id,
      google_rating, google_reviews_count, ai_intent_score, status,
      lead_score, lead_source, pipeline, stage, stage_entered_at
    ) VALUES (
      v_name,
      COALESCE(NULLIF(BTRIM(v_identity->>'country'), ''), ''),
      NULLIF(BTRIM(v_identity->>'city'), ''),
      NULLIF(BTRIM(v_identity->>'website'), ''),
      NULLIF(BTRIM(v_lead->>'instagram_handle'), ''),
      NULLIF(BTRIM(v_lead->>'facebook_page'), ''),
      NULLIF(v_lead->>'rating', '')::numeric,
      NULLIF(v_lead->>'reviews', '')::integer,
      NULLIF(v_lead->>'ai_intent_score', '')::numeric,
      'lead',
      COALESCE(v_score, 0),
      'lead_finder',
      'opticals',
      'target',
      now()
    ) RETURNING id INTO v_contact_id;
    v_created_contact := true;
  ELSE
    -- Existing record: fill only blanks. Status and populated fields are kept.
    UPDATE public.contacts c SET
      website = CASE WHEN NULLIF(BTRIM(c.website), '') IS NULL THEN NULLIF(BTRIM(v_identity->>'website'), '') ELSE c.website END,
      city = CASE WHEN NULLIF(BTRIM(c.city), '') IS NULL THEN NULLIF(BTRIM(v_identity->>'city'), '') ELSE c.city END,
      instagram_handle = CASE WHEN NULLIF(BTRIM(c.instagram_handle), '') IS NULL THEN NULLIF(BTRIM(v_lead->>'instagram_handle'), '') ELSE c.instagram_handle END,
      facebook_page_id = CASE WHEN NULLIF(BTRIM(c.facebook_page_id), '') IS NULL THEN NULLIF(BTRIM(v_lead->>'facebook_page'), '') ELSE c.facebook_page_id END,
      google_rating = COALESCE(c.google_rating, NULLIF(v_lead->>'rating', '')::numeric),
      google_reviews_count = COALESCE(c.google_reviews_count, NULLIF(v_lead->>'reviews', '')::integer)
    WHERE c.id = v_contact_id;
  END IF;

  PERFORM public.lead_finder_apply_link(v_identity_id, 'contact', v_contact_id);

  -- The ERP link usually sits on the people under a company, so check children and
  -- people naming this company as their business as well as the record itself.
  SELECT COALESCE(c.is_customer, false) OR c.linked_customer_id IS NOT NULL
         OR EXISTS (
           SELECT 1 FROM public.contacts k
            WHERE COALESCE(k.is_archived, false) = false
              AND (k.is_customer IS TRUE OR k.linked_customer_id IS NOT NULL)
              AND (k.parent_id = c.id
                   OR (c.is_company IS TRUE AND k.business_name IS NOT NULL
                       AND lower(regexp_replace(k.business_name, '[^a-zA-Z0-9]', '', 'g'))
                         = lower(regexp_replace(c.name, '[^a-zA-Z0-9]', '', 'g'))))
         )
    INTO v_is_customer
    FROM public.contacts c WHERE c.id = v_contact_id;

  -- A prospect enters the pipeline at Target unless it is already on the board.
  IF NOT v_is_customer THEN
    UPDATE public.contacts
       SET pipeline = 'opticals', stage = 'target', stage_entered_at = now()
     WHERE id = v_contact_id AND pipeline IS NULL AND stage IS NULL;
  END IF;

  -- Opportunity: prospects only, one per contact+title.
  IF NOT v_is_customer THEN
    INSERT INTO public.opportunities (contact_id, title, stage, country, volume_tier)
    VALUES (v_contact_id, v_name || ' Opportunity', 'new', NULLIF(BTRIM(v_identity->>'country'), ''), 'medium')
    ON CONFLICT (contact_id, title) DO NOTHING;
    SELECT id INTO v_opportunity_id FROM public.opportunities
     WHERE contact_id = v_contact_id AND title = v_name || ' Opportunity';
  END IF;

  -- Import note: once per business.
  v_note_id := v_review.note_id;
  IF v_note_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.notes WHERE id = v_note_id) THEN
    INSERT INTO public.notes (contact_id, content)
    VALUES (v_contact_id, 'Lead imported via Lead Finder. Score: ' || COALESCE(v_score::text, '0'))
    RETURNING id INTO v_note_id;
  END IF;

  -- Follow-up task: created once, then kept in step while still open.
  v_task_id := v_review.task_id;
  IF v_follow THEN
    IF v_task_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.activities WHERE id = v_task_id) THEN
      UPDATE public.activities
         SET owner_id = v_owner, due_at = v_due, contact_id = v_contact_id, updated_at = now()
       WHERE id = v_task_id AND status IN ('inbox', 'planned', 'in_progress', 'waiting');
    ELSE
      INSERT INTO public.activities (
        contact_id, opportunity_id, activity_type, type, status, priority,
        owner_id, created_by, due_at, content
      ) VALUES (
        v_contact_id, v_opportunity_id, 'Lead Finder follow-up', 'note', 'planned', 'normal',
        v_owner, v_uid, v_due,
        'Follow up with ' || v_name || ' (from Lead Finder).'
      ) RETURNING id INTO v_task_id;
    END IF;
  END IF;

  INSERT INTO public.lead_discovery_reviews AS r (
    identity_id, contact_id, connection_strength, needs_follow_up, follow_up_owner,
    follow_up_due_at, opportunity_id, note_id, task_id, reviewed_by, reviewed_at
  ) VALUES (
    v_identity_id, v_contact_id, v_strength, v_follow, CASE WHEN v_follow THEN v_owner END,
    CASE WHEN v_follow THEN v_due END, v_opportunity_id, v_note_id, v_task_id, v_uid, now()
  )
  ON CONFLICT (identity_id) DO UPDATE SET
    contact_id = EXCLUDED.contact_id,
    connection_strength = EXCLUDED.connection_strength,
    needs_follow_up = EXCLUDED.needs_follow_up,
    follow_up_owner = EXCLUDED.follow_up_owner,
    follow_up_due_at = EXCLUDED.follow_up_due_at,
    opportunity_id = COALESCE(EXCLUDED.opportunity_id, r.opportunity_id),
    note_id = EXCLUDED.note_id,
    task_id = COALESCE(EXCLUDED.task_id, r.task_id),
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = now();

  -- Audit trail only on first save of this business; failures here never undo the save.
  IF v_review.id IS NULL THEN
    BEGIN
      INSERT INTO public.lead_events (event_type, contact_id, opportunity_id, user_id, provider_diagnostics_summary)
      VALUES ('saved_to_crm', v_contact_id, v_opportunity_id, v_uid, jsonb_build_object(
        'source', 'lead_finder', 'lead_name', v_name, 'score', v_score,
        'search_run_id', v_lead->>'search_run_id', 'created_contact', v_created_contact));
      INSERT INTO public.lead_scoring_outcomes (contact_id, opportunity_id, outcome_stage, model_score, score_breakdown, metadata)
      VALUES (v_contact_id, v_opportunity_id, 'imported_to_crm', v_score,
        COALESCE(v_lead->'score_breakdown', '{}'::jsonb),
        jsonb_build_object('source', 'lead_finder', 'lead_name', v_name));
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'identity_id', v_identity_id,
    'contact_id', v_contact_id,
    'created_contact', v_created_contact,
    'opportunity_id', v_opportunity_id,
    'note_id', v_note_id,
    'task_id', v_task_id,
    'already_saved', v_review.id IS NOT NULL
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
