-- Continuous CRM contact enrichment from public web sources.
--
-- Policy (agreed with the business):
--   * a blank field may be filled silently, with the source URL, retrieval
--     date and confidence recorded for every value written;
--   * anything that CONTRADICTS a value already on the contact is never
--     written — it becomes a finding for an administrator to approve.
--
-- Nothing here calls out to the web. The edge function crm-enrich-contacts
-- does the lookups and calls apply_contact_enrichment to write.

-- ---------------------------------------------------------------- attempts
CREATE TABLE IF NOT EXISTS public.contact_enrichment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  batch_id uuid,
  trigger_source text NOT NULL CHECK (trigger_source IN ('scheduled', 'manual', 'oncreate', 'copilot')),
  provider text NOT NULL DEFAULT 'google_places',
  outcome text NOT NULL CHECK (outcome IN ('matched', 'no_match', 'ambiguous', 'error', 'skipped')),
  place_id text,
  match_confidence numeric(3, 2),
  error text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_enrichment_attempts_contact_idx
  ON public.contact_enrichment_attempts (contact_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS contact_enrichment_attempts_attempted_idx
  ON public.contact_enrichment_attempts (attempted_at DESC);

-- ---------------------------------------------------------------- findings
-- Field-level before/after with provenance, per
-- docs/portal-copilot-connected-capabilities.md.
CREATE TABLE IF NOT EXISTS public.contact_enrichment_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.contact_enrichment_attempts(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value text,
  new_value text NOT NULL,
  source text NOT NULL CHECK (source IN ('google_places', 'firecrawl')),
  source_url text,
  confidence numeric(3, 2) NOT NULL,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  disposition text NOT NULL CHECK (disposition IN ('applied', 'pending_review', 'rejected', 'unchanged')),
  action_id uuid REFERENCES public.copilot_actions(id) ON DELETE SET NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_enrichment_findings_pending_idx
  ON public.contact_enrichment_findings (disposition, created_at DESC)
  WHERE disposition = 'pending_review';
CREATE INDEX IF NOT EXISTS contact_enrichment_findings_contact_idx
  ON public.contact_enrichment_findings (contact_id, created_at DESC);

ALTER TABLE public.contact_enrichment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_enrichment_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read contact enrichment attempts" ON public.contact_enrichment_attempts;
CREATE POLICY "Admins can read contact enrichment attempts"
  ON public.contact_enrichment_attempts FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins can read contact enrichment findings" ON public.contact_enrichment_findings;
CREATE POLICY "Admins can read contact enrichment findings"
  ON public.contact_enrichment_findings FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

GRANT SELECT ON public.contact_enrichment_attempts TO authenticated;
GRANT SELECT ON public.contact_enrichment_findings TO authenticated;

-- ------------------------------------------------- preserve-trigger opt-in
-- preserve_populated_crm_fields_on_innovations_sync protects admin-entered
-- values from being overwritten by ANY service-role writer, which includes the
-- enricher. Blank-fill already passes (the COALESCE keeps NEW when OLD is
-- blank), but an APPROVED correction would be silently reverted. Add a
-- transaction-local opt-in that only apply_contact_enrichment sets; the
-- Innovations receiver never sets it, so its protection is unchanged.
CREATE OR REPLACE FUNCTION public.preserve_populated_crm_fields_on_innovations_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- The Innovations receiver is the only service-role writer for these rows.
  -- Keep normal staff edits unrestricted.
  IF auth.role() <> 'service_role' THEN
    RETURN NEW;
  END IF;

  -- An administrator has explicitly approved this correction.
  IF current_setting('app.crm_enrichment_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'customers' AND OLD.innovations_customer_id IS NOT NULL THEN
    NEW.name := COALESCE(NULLIF(BTRIM(OLD.name), ''), NEW.name);
    NEW.account_number := COALESCE(NULLIF(BTRIM(OLD.account_number), ''), NEW.account_number);
    NEW.address := COALESCE(NULLIF(BTRIM(OLD.address), ''), NEW.address);
    NEW.country_code := COALESCE(NULLIF(BTRIM(OLD.country_code), ''), NEW.country_code);
    NEW.email := COALESCE(NULLIF(BTRIM(OLD.email), ''), NEW.email);
    NEW.phone := COALESCE(NULLIF(BTRIM(OLD.phone), ''), NEW.phone);
    NEW.notes := COALESCE(NULLIF(BTRIM(OLD.notes), ''), NEW.notes);
    NEW.pay_by_card := COALESCE(OLD.pay_by_card, NEW.pay_by_card);
    NEW.pay_by_eft := COALESCE(OLD.pay_by_eft, NEW.pay_by_eft);
    NEW.eft_institution_name := COALESCE(NULLIF(BTRIM(OLD.eft_institution_name), ''), NEW.eft_institution_name);
    NEW.default_payment_type := COALESCE(OLD.default_payment_type, NEW.default_payment_type);
  ELSIF TG_TABLE_NAME = 'contacts' AND OLD.innovations_contact_id IS NOT NULL THEN
    NEW.name := COALESCE(NULLIF(BTRIM(OLD.name), ''), NEW.name);
    NEW.business_name := COALESCE(NULLIF(BTRIM(OLD.business_name), ''), NEW.business_name);
    NEW.email := COALESCE(NULLIF(BTRIM(OLD.email), ''), NEW.email);
    NEW.phone := COALESCE(NULLIF(BTRIM(OLD.phone), ''), NEW.phone);
    NEW.street := COALESCE(NULLIF(BTRIM(OLD.street), ''), NEW.street);
    NEW.street2 := COALESCE(NULLIF(BTRIM(OLD.street2), ''), NEW.street2);
    NEW.city := COALESCE(NULLIF(BTRIM(OLD.city), ''), NEW.city);
    NEW.state := COALESCE(NULLIF(BTRIM(OLD.state), ''), NEW.state);
    NEW.zip := COALESCE(NULLIF(BTRIM(OLD.zip), ''), NEW.zip);
    NEW.country := COALESCE(NULLIF(BTRIM(OLD.country), ''), NEW.country);
    NEW.country_code := COALESCE(NULLIF(BTRIM(OLD.country_code), ''), NEW.country_code);
    NEW.is_company := COALESCE(OLD.is_company, NEW.is_company);
    NEW.status := COALESCE(NULLIF(BTRIM(OLD.status), ''), NEW.status);
    NEW.pipeline_stage := COALESCE(NULLIF(BTRIM(OLD.pipeline_stage), ''), NEW.pipeline_stage);
    NEW.type := COALESCE(NULLIF(BTRIM(OLD.type), ''), NEW.type);
    NEW.notes := COALESCE(NULLIF(BTRIM(OLD.notes), ''), NEW.notes);
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------- batch selection
CREATE OR REPLACE FUNCTION public.select_contacts_for_enrichment(
  p_limit integer DEFAULT 40,
  p_mode text DEFAULT 'scheduled'
)
RETURNS TABLE (
  id uuid,
  name text,
  business_name text,
  street text,
  city text,
  state text,
  zip text,
  country text,
  country_code text,
  website text,
  phone text,
  google_place_id text,
  innovations_contact_id integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'select_contacts_for_enrichment requires the service role';
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.business_name, c.street, c.city, c.state, c.zip,
         c.country, c.country_code, c.website, c.phone, c.google_place_id,
         c.innovations_contact_id
  FROM public.contacts c
  LEFT JOIN LATERAL (
    SELECT max(a.attempted_at) AS last_at
    FROM public.contact_enrichment_attempts a
    WHERE a.contact_id = c.id
  ) a ON true
  WHERE c.is_archived = false
    -- Something to search on.
    AND COALESCE(NULLIF(BTRIM(c.business_name), ''), NULLIF(BTRIM(c.name), '')) IS NOT NULL
    -- 'oncreate' picks up brand-new contacts only.
    AND (p_mode <> 'oncreate' OR (a.last_at IS NULL AND c.created_at > now() - interval '24 hours'))
    -- Never re-spend on the same contact inside 30 days.
    AND (a.last_at IS NULL OR a.last_at < now() - interval '30 days')
    -- Something still worth looking up.
    AND (
      NULLIF(BTRIM(c.website), '') IS NULL
      OR NULLIF(BTRIM(c.city), '') IS NULL
      OR NULLIF(BTRIM(c.phone), '') IS NULL
      OR c.google_place_id IS NULL
    )
  ORDER BY a.last_at NULLS FIRST, c.updated_at DESC
  LIMIT least(greatest(p_limit, 1), 100);
END;
$$;

REVOKE ALL ON FUNCTION public.select_contacts_for_enrichment(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.select_contacts_for_enrichment(integer, text) TO service_role;

-- -------------------------------------------------------------- apply path
-- The single write path for enrichment. Silent blank-fills and approved
-- corrections both come through here, so provenance is never bypassed.
CREATE OR REPLACE FUNCTION public.apply_contact_enrichment(
  p_contact_id uuid,
  p_finding_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field text;
  v_value text;
  v_applied integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'apply_contact_enrichment requires the service role';
  END IF;

  -- Transaction-local: lets an approved correction past the preserve trigger.
  PERFORM set_config('app.crm_enrichment_write', 'on', true);

  FOR v_field, v_value IN
    SELECT f.field, f.new_value
    FROM public.contact_enrichment_findings f
    WHERE f.id = ANY (p_finding_ids)
      AND f.contact_id = p_contact_id
      AND f.disposition = 'pending_review'
  LOOP
    IF v_field IN ('website', 'phone', 'street', 'city', 'state', 'zip',
                   'country', 'country_code', 'google_place_id') THEN
      EXECUTE format('UPDATE public.contacts SET %I = $1 WHERE id = $2', v_field)
        USING v_value, p_contact_id;
    ELSIF v_field = 'google_rating' THEN
      UPDATE public.contacts SET google_rating = v_value::numeric WHERE id = p_contact_id;
    ELSIF v_field = 'google_reviews_count' THEN
      UPDATE public.contacts SET google_reviews_count = v_value::integer WHERE id = p_contact_id;
    ELSE
      RAISE EXCEPTION 'field % is not enrichable', v_field;
    END IF;
    v_applied := v_applied + 1;
  END LOOP;

  UPDATE public.contact_enrichment_findings
     SET disposition = 'applied', applied_at = now()
   WHERE id = ANY (p_finding_ids)
     AND contact_id = p_contact_id
     AND disposition = 'pending_review';

  RETURN v_applied;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_contact_enrichment(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_contact_enrichment(uuid, uuid[]) TO service_role;

-- --------------------------------------------------------- governed action
-- Reuse the existing propose -> approve -> execute path rather than building a
-- second review queue.
ALTER TABLE public.copilot_actions DROP CONSTRAINT IF EXISTS copilot_actions_action_type_check;
ALTER TABLE public.copilot_actions
  ADD CONSTRAINT copilot_actions_action_type_check
  CHECK (action_type IN ('send_portal_invite', 'create_followup_task', 'send_docstudio_email', 'apply_contact_enrichment'));

-- copilot_runs.workflow is a foreign key to this table; without the row an
-- enrichment run fails with a raw FK error.
INSERT INTO public.copilot_workflow_settings
  (workflow, provider, email_template_key, email_template_name, email_subject_pattern)
VALUES
  ('crm_enrichment', 'claude', 'not-applicable', 'Not applicable', 'Not applicable')
ON CONFLICT (workflow) DO NOTHING;

NOTIFY pgrst, 'reload schema';
