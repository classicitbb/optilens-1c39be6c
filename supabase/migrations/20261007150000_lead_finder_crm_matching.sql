-- Lead Finder: CRM matching, customer recognition, relationship review and an
-- explicit transactional save.
--
-- Search itself writes nothing. Rows here are created only when an operator
-- confirms a link, marks a current customer, or saves a lead.
--
-- Three concerns stay distinct:
--   * lead_discovery_identities - the stable identity of a discovered business
--   * lead_discovery_links      - a confirmed association (contact link, or a
--                                  customer mark that needs no contact)
--   * lead_discovery_reviews    - the operator's relationship call + follow-up
-- Company and customer-account links on contacts/customers are never changed here.
--
-- Writes go through the SECURITY DEFINER RPCs below, which require the existing
-- CRM edit role. Reads use the existing CRM read role.

CREATE TABLE IF NOT EXISTS public.lead_discovery_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- name|location key built by the lead-intelligence function; see crmMatching.ts
  identity_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  city text,
  country text,
  website text,
  website_host text,
  formatted_address text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_discovery_identities_name_idx
  ON public.lead_discovery_identities (normalized_name);
CREATE INDEX IF NOT EXISTS lead_discovery_identities_host_idx
  ON public.lead_discovery_identities (website_host) WHERE website_host IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lead_discovery_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES public.lead_discovery_identities(id) ON DELETE CASCADE,
  link_kind text NOT NULL CHECK (link_kind IN ('contact', 'customer_mark')),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  confirmed_by uuid,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid,
  revoked_at timestamptz,
  CONSTRAINT lead_discovery_links_kind_contact CHECK (
    (link_kind = 'contact' AND contact_id IS NOT NULL) OR
    (link_kind = 'customer_mark' AND contact_id IS NULL)
  )
);

-- One live decision per business; corrections revoke rather than delete.
CREATE UNIQUE INDEX IF NOT EXISTS lead_discovery_links_active_identity_key
  ON public.lead_discovery_links (identity_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS lead_discovery_links_contact_idx
  ON public.lead_discovery_links (contact_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.lead_discovery_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL UNIQUE REFERENCES public.lead_discovery_identities(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  connection_strength text NOT NULL DEFAULT 'unclassified'
    CHECK (connection_strength IN ('unclassified', 'strong', 'not_strong')),
  needs_follow_up boolean NOT NULL DEFAULT false,
  follow_up_owner uuid,
  follow_up_due_at timestamptz,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  reviewed_by uuid,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_discovery_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_discovery_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_discovery_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view lead discovery identities" ON public.lead_discovery_identities;
CREATE POLICY "Staff can view lead discovery identities" ON public.lead_discovery_identities
  FOR SELECT TO authenticated USING (public.has_any_role((select auth.uid())));
DROP POLICY IF EXISTS "Staff can view lead discovery links" ON public.lead_discovery_links;
CREATE POLICY "Staff can view lead discovery links" ON public.lead_discovery_links
  FOR SELECT TO authenticated USING (public.has_any_role((select auth.uid())));
DROP POLICY IF EXISTS "Staff can view lead discovery reviews" ON public.lead_discovery_reviews;
CREATE POLICY "Staff can view lead discovery reviews" ON public.lead_discovery_reviews
  FOR SELECT TO authenticated USING (public.has_any_role((select auth.uid())));

REVOKE INSERT, UPDATE, DELETE ON public.lead_discovery_identities FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.lead_discovery_links FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.lead_discovery_reviews FROM anon, authenticated;
REVOKE ALL ON public.lead_discovery_identities FROM anon;
REVOKE ALL ON public.lead_discovery_links FROM anon;
REVOKE ALL ON public.lead_discovery_reviews FROM anon;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Upserts the identity row and returns its id. Caller already holds the
-- per-identity advisory lock.
CREATE OR REPLACE FUNCTION public.lead_finder_touch_identity(p_identity jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_key text := NULLIF(BTRIM(p_identity->>'identity_key'), '');
BEGIN
  IF v_key IS NULL OR NULLIF(BTRIM(p_identity->>'display_name'), '') IS NULL THEN
    RAISE EXCEPTION 'identity_key and display_name are required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.lead_discovery_identities AS i (
    identity_key, display_name, normalized_name, city, country, website, website_host, formatted_address
  ) VALUES (
    v_key,
    BTRIM(p_identity->>'display_name'),
    COALESCE(NULLIF(BTRIM(p_identity->>'normalized_name'), ''), lower(BTRIM(p_identity->>'display_name'))),
    NULLIF(BTRIM(p_identity->>'city'), ''),
    NULLIF(BTRIM(p_identity->>'country'), ''),
    NULLIF(BTRIM(p_identity->>'website'), ''),
    NULLIF(BTRIM(p_identity->>'website_host'), ''),
    NULLIF(BTRIM(p_identity->>'formatted_address'), '')
  )
  ON CONFLICT (identity_key) DO UPDATE SET
    last_seen_at = now(),
    city = COALESCE(i.city, EXCLUDED.city),
    country = COALESCE(i.country, EXCLUDED.country),
    website = COALESCE(i.website, EXCLUDED.website),
    website_host = COALESCE(i.website_host, EXCLUDED.website_host),
    formatted_address = COALESCE(i.formatted_address, EXCLUDED.formatted_address)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.lead_finder_touch_identity(jsonb) FROM PUBLIC, anon, authenticated;

-- Replaces the live decision for an identity. Idempotent when unchanged.
CREATE OR REPLACE FUNCTION public.lead_finder_apply_link(
  p_identity_id uuid, p_kind text, p_contact_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_live public.lead_discovery_links%ROWTYPE;
BEGIN
  SELECT * INTO v_live FROM public.lead_discovery_links
   WHERE identity_id = p_identity_id AND revoked_at IS NULL;

  IF FOUND AND v_live.link_kind = p_kind AND v_live.contact_id IS NOT DISTINCT FROM p_contact_id THEN
    RETURN;
  END IF;

  IF FOUND THEN
    UPDATE public.lead_discovery_links
       SET revoked_at = now(), revoked_by = auth.uid()
     WHERE id = v_live.id;
  END IF;

  INSERT INTO public.lead_discovery_links (identity_id, link_kind, contact_id, confirmed_by)
  VALUES (p_identity_id, p_kind, p_contact_id, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.lead_finder_apply_link(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Link / mark / unlink (manual confirmation persists the decision)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lead_finder_confirm_link(
  p_identity jsonb, p_contact_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identity_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'CRM edit access required' USING ERRCODE = '42501';
  END IF;
  IF p_contact_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = p_contact_id) THEN
    RAISE EXCEPTION 'Contact not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('lead_finder:' || COALESCE(p_identity->>'identity_key', '')));
  v_identity_id := public.lead_finder_touch_identity(p_identity);
  PERFORM public.lead_finder_apply_link(v_identity_id, 'contact', p_contact_id);
  RETURN jsonb_build_object('identity_id', v_identity_id, 'contact_id', p_contact_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_finder_mark_customer(p_identity jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identity_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'CRM edit access required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('lead_finder:' || COALESCE(p_identity->>'identity_key', '')));
  v_identity_id := public.lead_finder_touch_identity(p_identity);
  PERFORM public.lead_finder_apply_link(v_identity_id, 'customer_mark', NULL);
  RETURN jsonb_build_object('identity_id', v_identity_id);
END;
$$;

-- Corrects a mistaken contact link or customer mark. Never touches the contact.
CREATE OR REPLACE FUNCTION public.lead_finder_clear_link(p_identity_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleared integer;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'CRM edit access required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('lead_finder:' || COALESCE(p_identity_key, '')));
  UPDATE public.lead_discovery_links l
     SET revoked_at = now(), revoked_by = auth.uid()
    FROM public.lead_discovery_identities i
   WHERE l.identity_id = i.id AND i.identity_key = p_identity_key AND l.revoked_at IS NULL;
  GET DIAGNOSTICS v_cleared = ROW_COUNT;
  RETURN jsonb_build_object('cleared', v_cleared);
END;
$$;

-- ---------------------------------------------------------------------------
-- Explicit, transactional, idempotent save
-- ---------------------------------------------------------------------------
-- p_payload keys:
--   identity {identity_key, display_name, normalized_name, city, country, website,
--             website_host, formatted_address}
--   contact_id        selected existing contact (manual choice), optional
--   lead {rating, reviews, instagram_handle, facebook_page, score, ai_intent_score,
--         score_breakdown, search_run_id, lead_segment}
--   connection_strength, needs_follow_up, follow_up_owner, follow_up_due_at
-- Everything below commits or rolls back together; re-running is a no-op apart
-- from updating the review/task fields.
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
      lead_score, lead_source
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
      'lead_finder'
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

  SELECT COALESCE(c.is_customer, false) OR c.linked_customer_id IS NOT NULL
    INTO v_is_customer
    FROM public.contacts c WHERE c.id = v_contact_id;

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

REVOKE ALL ON FUNCTION public.lead_finder_confirm_link(jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lead_finder_mark_customer(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lead_finder_clear_link(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lead_finder_save_lead(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_finder_confirm_link(jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_finder_mark_customer(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_finder_clear_link(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_finder_save_lead(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
