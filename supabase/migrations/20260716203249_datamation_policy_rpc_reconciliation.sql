-- Focused Lovable Cloud -> Datamation RLS/RPC reconciliation.
-- R1 only: no data movement, Edge Functions, cron schedules, Vercel changes,
-- R2 compatibility views, retired Odoo objects, owner-decision objects, or
-- Supabase-managed Realtime partitions.
BEGIN;

-- Final repository definitions for active R1 RPCs.
CREATE OR REPLACE FUNCTION public.api_get_or_create_catalog_draft(p_api_key_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id integer;
  v_is_template boolean;
  v_new_id integer;
  v_key_name text;
BEGIN
  SELECT k.draft_pricelist_version_id, k.name
    INTO v_existing_id, v_key_name
  FROM public.api_keys k
  WHERE k.id = p_api_key_id;

  IF v_existing_id IS NOT NULL THEN
    SELECT pv.is_template INTO v_is_template
    FROM public.pricelist_versions pv
    WHERE pv.id = v_existing_id;
    -- Reuse the existing draft whether it is still a draft or has been saved
    -- as a template; only rotate if the underlying version no longer exists.
    IF v_is_template IS NOT NULL THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  INSERT INTO public.pricelist_versions (name, is_template)
  VALUES (coalesce('API Draft – ' || v_key_name, 'API Draft'), false)
  RETURNING id INTO v_new_id;

  UPDATE public.api_keys
     SET draft_pricelist_version_id = v_new_id
   WHERE id = p_api_key_id;

  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_customer_account_number(
  p_customer_id integer,
  p_account_number text
)
RETURNS TABLE (
  ok boolean,
  status text,
  customer_id integer,
  account_number text,
  conflict_customer_id integer,
  conflict_customer_name text,
  conflict_account_number text,
  message text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account text;
  v_target_id integer;
  v_conflict record;
BEGIN
  v_account := public.normalized_customer_account_number(p_account_number);

  -- Serialize operator assignments so the preflight conflict check and update
  -- agree even if two admins save the same account number at nearly the same time.
  LOCK TABLE public.customers IN SHARE ROW EXCLUSIVE MODE;

  SELECT c.id INTO v_target_id
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF v_target_id IS NULL THEN
    RETURN QUERY SELECT
      false,
      'not_found'::text,
      p_customer_id,
      v_account,
      NULL::integer,
      NULL::text,
      NULL::text,
      format('Customer #%s was not found.', p_customer_id);
    RETURN;
  END IF;

  IF v_account IS NOT NULL THEN
    SELECT c.id, c.name, c.account_number
    INTO v_conflict
    FROM public.customers c
    WHERE c.id <> p_customer_id
      AND public.normalized_customer_account_number(c.account_number) = v_account
    ORDER BY c.updated_at DESC NULLS LAST, c.id DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT
        false,
        'conflict'::text,
        p_customer_id,
        v_account,
        v_conflict.id::integer,
        v_conflict.name::text,
        v_conflict.account_number::text,
        format('%s is already linked to Customer #%s: %s', v_account, v_conflict.id, coalesce(v_conflict.name, 'Unnamed customer'));
      RETURN;
    END IF;
  END IF;

  UPDATE public.customers
  SET account_number = v_account
  WHERE id = p_customer_id;

  RETURN QUERY SELECT
    true,
    CASE WHEN v_account IS NULL THEN 'cleared' ELSE 'assigned' END::text,
    p_customer_id,
    v_account,
    NULL::integer,
    NULL::text,
    NULL::text,
    CASE WHEN v_account IS NULL
      THEN format('Customer #%s account number was cleared.', p_customer_id)
      ELSE format('Customer #%s account number was set to %s.', p_customer_id, v_account)
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_customer_statement(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RETURN false;
  END IF;

  IF public.has_edit_role(p_user_id) THEN
    RETURN true;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND OR v_profile.portal_access_status <> 'approved_customer' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    WITH scoped_contacts AS (
      SELECT c.id
      FROM public.contacts c
      WHERE c.id = v_profile.crm_contact_id

      UNION

      SELECT parent.id
      FROM public.contacts child
      JOIN public.contacts parent ON parent.id = child.parent_id
      WHERE child.id = v_profile.crm_contact_id

      UNION

      SELECT customer_contact.id
      FROM public.customers customer
      JOIN public.contacts customer_contact ON customer_contact.id = customer.contact_id
      WHERE customer.id = v_profile.crm_customer_id
    )
    SELECT 1
    FROM scoped_contacts scoped
    JOIN public.contact_tag_links link ON link.contact_id = scoped.id
    JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE lower(btrim(tag.name)) IN ('owner', 'ceo', 'buyer')
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_live_data_gateway_request(p_agent_key_id uuid)
RETURNS TABLE (
  id uuid,
  source text,
  operation text,
  target jsonb,
  arguments jsonb,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_data_gateway_requests AS stale
  SET status = 'expired',
      error_code = 'request_expired',
      error_message = 'The live source did not answer before the request expired.',
      completed_at = now()
  WHERE stale.status IN ('pending', 'claimed')
    AND stale.expires_at <= now();

  RETURN QUERY
  WITH next_request AS (
    SELECT request_row.id
    FROM public.live_data_gateway_requests AS request_row
    WHERE request_row.status = 'pending'
      AND request_row.expires_at > now()
    ORDER BY request_row.requested_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.live_data_gateway_requests AS claimed
  SET status = 'claimed',
      claimed_by = p_agent_key_id,
      claimed_at = now()
  FROM next_request
  WHERE claimed.id = next_request.id
  RETURNING claimed.id, claimed.source, claimed.operation, claimed.target,
            claimed.arguments, claimed.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_api_key(
  p_name text,
  p_scopes text[],
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_secret text;
  v_prefix text;
  v_token text;
  v_hash text;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create API keys.';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'API key name is required.';
  END IF;

  v_prefix := encode(extensions.gen_random_bytes(4), 'hex');
  v_secret := encode(extensions.gen_random_bytes(24), 'hex');
  v_token := 'clv_live_' || v_prefix || '_' || v_secret;
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.api_keys (name, key_prefix, key_hash, scopes, created_by, expires_at)
  VALUES (btrim(p_name), v_prefix, v_hash, COALESCE(p_scopes, '{}'), auth.uid(), p_expires_at)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'name', btrim(p_name),
    'key_prefix', v_prefix,
    'token', v_token,
    'scopes', COALESCE(p_scopes, '{}'),
    'expires_at', p_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.effective_price(p_customer_id integer, p_item_ref uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_price numeric;
BEGIN
  IF NOT (
    public.has_edit_role(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.user_id = auth.uid() AND pr.crm_customer_id = p_customer_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to read prices for this customer.';
  END IF;

  SELECT pl.custom_price INTO v_price
    FROM public.pricelist_lines pl
    JOIN public.pricelists p ON p.id = pl.pricelist_id
   WHERE p.kind = 'custom' AND p.customer_id = p_customer_id AND pl.item_ref = p_item_ref
   LIMIT 1;

  IF v_price IS NULL THEN
    SELECT pl.custom_price INTO v_price
      FROM public.pricelist_lines pl
      JOIN public.pricelists p ON p.id = pl.pricelist_id
     WHERE p.kind = 'master' AND pl.item_ref = p_item_ref
     LIMIT 1;
  END IF;

  RETURN v_price;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalized_customer_account_number(p_account_number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(upper(btrim(p_account_number)), '')
$$;

CREATE OR REPLACE FUNCTION public.find_customer_by_account_number(p_account_number text)
RETURNS TABLE (
  id integer,
  name text,
  account_number text,
  innovations_customer_id integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT c.id, c.name, c.account_number, c.innovations_customer_id
  FROM public.customers c
  WHERE public.normalized_customer_account_number(c.account_number) = public.normalized_customer_account_number(p_account_number)
  ORDER BY c.updated_at DESC NULLS LAST, c.id DESC
$$;

CREATE OR REPLACE FUNCTION public.get_portal_erp_account_number()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT NULLIF(BTRIM(c.account_number::text), '')
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.link_order_activity_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.contact_id IS NULL THEN
    SELECT id INTO NEW.contact_id
    FROM public.contacts
    WHERE innovations_contact_id = NEW.innovations_customer_id
       OR linked_customer_id = NEW.innovations_customer_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_matrix()
RETURNS TABLE (
  category text,
  material_index text,
  treatment_type text,
  allocated_price_bbd numeric
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

  RETURN QUERY
  SELECT ma.category, ma.material_index, ma.treatment_type, ma.allocated_price_bbd
  FROM public.matrix_allocations ma
  WHERE ma.pricelist_version_id = v_pricelist_version_id
    AND ma.is_active IS NOT FALSE
    AND ma.allocated_price_bbd IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_updated_at()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT pv.updated_at
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  INNER JOIN public.pricelist_versions pv ON pv.id = c.assigned_pricelist_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.revert_account_to_master(p_customer_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_id uuid;
  v_before jsonb;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can revert prices.';
  END IF;

  SELECT id INTO v_pricelist_id FROM public.pricelists WHERE kind = 'custom' AND customer_id = p_customer_id;
  IF v_pricelist_id IS NULL THEN
    RETURN;
  END IF;

  SELECT jsonb_agg(to_jsonb(pl)) INTO v_before FROM public.pricelist_lines pl WHERE pl.pricelist_id = v_pricelist_id;

  DELETE FROM public.pricelist_lines WHERE pricelist_id = v_pricelist_id;
  -- Leave the (now-empty) custom pricelist row in place — effective_price
  -- already falls back to master when no line exists; an empty fork tracks
  -- master on every item until a new line is added.

  INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
  VALUES (auth.uid(), 'revert_account_to_master', 'pricelists', v_pricelist_id::text, v_before, NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.revert_line_to_master(p_customer_id integer, p_item_ref uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_id uuid;
  v_before jsonb;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can revert prices.';
  END IF;

  SELECT id INTO v_pricelist_id FROM public.pricelists WHERE kind = 'custom' AND customer_id = p_customer_id;
  IF v_pricelist_id IS NULL THEN
    RETURN; -- no fork exists, nothing to revert
  END IF;

  SELECT to_jsonb(pl) INTO v_before FROM public.pricelist_lines pl
   WHERE pl.pricelist_id = v_pricelist_id AND pl.item_ref = p_item_ref;

  DELETE FROM public.pricelist_lines WHERE pricelist_id = v_pricelist_id AND item_ref = p_item_ref;

  IF v_before IS NOT NULL THEN
    INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
    VALUES (auth.uid(), 'revert_line_to_master', 'pricelist_lines', (v_before ->> 'id'), v_before, NULL);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_api_key(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke API keys.';
  END IF;
  UPDATE public.api_keys SET revoked_at = COALESCE(revoked_at, now()) WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_custom_price(
  p_customer_id integer,
  p_item_ref uuid,
  p_price numeric,
  p_reason text DEFAULT NULL,
  p_source text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_id uuid;
  v_before jsonb;
  v_line_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can set prices.';
  END IF;

  -- Auto-fork on first custom write for this customer (locked decision:
  -- the moment ONE price changes for a customer, the account forks).
  INSERT INTO public.pricelists (kind, customer_id, created_by)
  VALUES ('custom', p_customer_id, auth.uid())
  ON CONFLICT (customer_id) WHERE kind = 'custom' DO NOTHING;

  SELECT id INTO v_pricelist_id FROM public.pricelists WHERE kind = 'custom' AND customer_id = p_customer_id;

  SELECT to_jsonb(pl), pl.id INTO v_before, v_line_id
    FROM public.pricelist_lines pl WHERE pl.pricelist_id = v_pricelist_id AND pl.item_ref = p_item_ref;

  INSERT INTO public.pricelist_lines (pricelist_id, item_ref, custom_price, reason, source, created_by)
  VALUES (v_pricelist_id, p_item_ref, p_price, p_reason, p_source, auth.uid())
  ON CONFLICT (pricelist_id, item_ref)
  DO UPDATE SET custom_price = EXCLUDED.custom_price, reason = EXCLUDED.reason, source = EXCLUDED.source, updated_at = now()
  RETURNING id INTO v_line_id;

  INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
  SELECT auth.uid(), 'set_custom_price', 'pricelist_lines', v_line_id::text, v_before, to_jsonb(pl)
  FROM public.pricelist_lines pl WHERE pl.id = v_line_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_master_price(p_item_ref uuid, p_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_master_id uuid;
  v_before jsonb;
  v_line_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can set prices.';
  END IF;

  SELECT id INTO v_master_id FROM public.pricelists WHERE kind = 'master';

  SELECT to_jsonb(pl), pl.id INTO v_before, v_line_id
    FROM public.pricelist_lines pl WHERE pl.pricelist_id = v_master_id AND pl.item_ref = p_item_ref;

  INSERT INTO public.pricelist_lines (pricelist_id, item_ref, custom_price, source, created_by)
  VALUES (v_master_id, p_item_ref, p_price, 'manual', auth.uid())
  ON CONFLICT (pricelist_id, item_ref)
  DO UPDATE SET custom_price = EXCLUDED.custom_price, updated_at = now()
  RETURNING id INTO v_line_id;

  INSERT INTO public.pricing_audit (actor, action, entity, entity_id, before, after)
  SELECT auth.uid(), 'set_master_price', 'pricelist_lines', v_line_id::text, v_before, to_jsonb(pl)
  FROM public.pricelist_lines pl WHERE pl.id = v_line_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_customer_portal_identity(p_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(profile_id uuid, portal_access_status text, portal_access_note text, email_verified boolean, profile_completed boolean, crm_contact_id uuid, crm_customer_id integer, assigned_pricelist_id integer, organization_name text, customer_name text, payment_terms text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user auth.users%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_contact public.contacts%ROWTYPE;
  v_parent_contact public.contacts%ROWTYPE;
  v_parent_company_id uuid;
  v_customer public.customers%ROWTYPE;
  v_email text;
  v_email_verified boolean := false;
  v_profile_completed boolean := false;
  v_contact_found boolean := false;
  v_parent_contact_found boolean := false;
  v_customer_found boolean := false;
  v_status text := 'pending_profile';
  v_note text := 'Complete your profile to create your CRM contact.';
  v_payment_terms text := 'standard';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'sync_customer_portal_identity requires a user id';
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No auth user found for %', p_user_id;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, email) VALUES (p_user_id, v_user.email) RETURNING * INTO v_profile;
  END IF;

  v_email := NULLIF(BTRIM(v_user.email), '');
  v_email_verified := v_user.email_confirmed_at IS NOT NULL;
  v_profile_completed := COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), NULL) IS NOT NULL
    AND COALESCE(NULLIF(BTRIM(v_profile.phone), ''), NULL) IS NOT NULL;

  IF COALESCE(NULLIF(BTRIM(v_profile.organization_name), ''), NULL) IS NOT NULL THEN
    SELECT id INTO v_parent_company_id FROM public.contacts
    WHERE is_company = true AND lower(name) = lower(BTRIM(v_profile.organization_name))
    ORDER BY is_customer DESC, linked_customer_id NULLS LAST, updated_at DESC LIMIT 1;
  END IF;

  IF v_email_verified AND v_profile_completed THEN
    IF v_profile.crm_contact_id IS NOT NULL THEN
      SELECT * INTO v_contact FROM public.contacts WHERE id = v_profile.crm_contact_id;
      v_contact_found := FOUND;
    END IF;

    IF NOT v_contact_found AND v_email IS NOT NULL THEN
      SELECT * INTO v_contact FROM public.contacts
      WHERE lower(COALESCE(email, '')) = lower(v_email)
      ORDER BY is_customer DESC, linked_customer_id NULLS LAST, updated_at DESC LIMIT 1;
      v_contact_found := FOUND;
    END IF;

    IF NOT v_contact_found THEN
      INSERT INTO public.contacts (name, email, phone, is_company, type, business_name, parent_id, country, status, is_customer, pipeline_stage)
      VALUES (
        COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), COALESCE(v_email, 'Customer contact')),
        v_email, NULLIF(BTRIM(v_profile.phone), ''), false, 'individual',
        NULLIF(BTRIM(v_profile.organization_name), ''), v_parent_company_id,
        'Barbados', 'lead', false, 'New'
      ) RETURNING * INTO v_contact;
      v_contact_found := true;
    ELSE
      UPDATE public.contacts SET
        name = COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), v_contact.name),
        email = COALESCE(v_email, v_contact.email),
        phone = COALESCE(NULLIF(BTRIM(v_profile.phone), ''), v_contact.phone),
        type = CASE WHEN v_contact.is_company THEN v_contact.type ELSE 'individual' END,
        business_name = COALESCE(NULLIF(BTRIM(v_profile.organization_name), ''), v_contact.business_name),
        parent_id = COALESCE(v_parent_company_id, v_contact.parent_id)
      WHERE id = v_contact.id RETURNING * INTO v_contact;
      v_contact_found := true;
    END IF;

    IF v_contact.parent_id IS NOT NULL THEN
      SELECT * INTO v_parent_contact
      FROM public.contacts
      WHERE id = v_contact.parent_id;
      v_parent_contact_found := FOUND;
    END IF;

    SELECT t.name INTO v_payment_terms
    FROM public.contact_tag_links l
    JOIN public.contact_tags t ON t.id = l.tag_id
    WHERE l.contact_id = v_contact.id
      AND t.name IN ('credit_approved', 'cash_only')
    ORDER BY CASE t.name WHEN 'credit_approved' THEN 0 ELSE 1 END
    LIMIT 1;
    v_payment_terms := COALESCE(v_payment_terms, 'standard');

    -- Resolution order (prefer live-linked customers before placeholder rows):
    -- 1. Contact's explicit linked_customer_id
    -- 2. Contact's innovations_parent_customer_id
    -- 3. Parent contact's linked_customer_id
    -- 4. Parent contact's innovations_parent_customer_id
    -- 5. Live-linked customer whose contact_id = own contact
    -- 6. Live-linked customer whose contact_id = parent contact
    -- 7. Any customer whose contact_id = own contact (placeholder)
    -- 8. Any customer whose contact_id = parent contact (placeholder)
    -- 9. Insert placeholder for is_customer contacts
    IF v_contact.linked_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers
      WHERE id = v_contact.linked_customer_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    IF NOT v_customer_found AND v_contact.innovations_parent_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers
      WHERE innovations_customer_id = v_contact.innovations_parent_customer_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    IF NOT v_customer_found AND v_parent_contact_found AND v_parent_contact.linked_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers
      WHERE id = v_parent_contact.linked_customer_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    IF NOT v_customer_found AND v_parent_contact_found AND v_parent_contact.innovations_parent_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers
      WHERE innovations_customer_id = v_parent_contact.innovations_parent_customer_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    -- Prefer any live-linked customer attached to this contact
    IF NOT v_customer_found THEN
      SELECT * INTO v_customer FROM public.customers
      WHERE contact_id = v_contact.id
        AND (innovations_customer_id IS NOT NULL OR NULLIF(BTRIM(account_number), '') IS NOT NULL)
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    -- Prefer any live-linked customer attached to the parent (organization) contact
    IF NOT v_customer_found AND v_parent_contact_found THEN
      SELECT * INTO v_customer FROM public.customers
      WHERE contact_id = v_parent_contact.id
        AND (innovations_customer_id IS NOT NULL OR NULLIF(BTRIM(account_number), '') IS NOT NULL)
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    -- Fall back to placeholder rows
    IF NOT v_customer_found THEN
      SELECT * INTO v_customer FROM public.customers
      WHERE contact_id = v_contact.id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    IF NOT v_customer_found AND v_parent_contact_found THEN
      SELECT * INTO v_customer FROM public.customers
      WHERE contact_id = v_parent_contact.id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    IF NOT v_customer_found AND v_contact.is_customer THEN
      INSERT INTO public.customers (name, email, phone, address, type, pipeline_stage, contact_id)
      VALUES (
        v_contact.name,
        NULLIF(v_contact.email, ''),
        v_contact.phone,
        NULLIF(v_contact.address, ''),
        'Customer',
        COALESCE(NULLIF(v_contact.pipeline_stage, ''), 'Prospect'),
        v_contact.id
      ) RETURNING * INTO v_customer;
      v_customer_found := true;
    END IF;

    IF v_customer_found AND v_customer.id IS NOT NULL THEN
      v_status := 'approved_customer';
      v_note := 'Your account is approved for quotes, helpdesk, pricelists, private-order workflows, and account statements.';

      INSERT INTO public.user_roles (user_id, role)
      SELECT p_user_id, 'customer'::public.app_role
      WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id)
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      v_status := 'pending_approval';
      v_note := 'Your CRM contact is ready. Customer-only workflows unlock after team approval.';
    END IF;
  ELSIF NOT v_email_verified THEN
    v_status := 'pending_verification';
    v_note := 'Verify your email address to activate your CRM contact and customer workflow.';
  ELSE
    v_status := 'pending_profile';
    v_note := 'Complete your profile with your full name and phone number to activate your CRM contact.';
  END IF;

  UPDATE public.profiles SET
    email = COALESCE(v_email, email),
    email_verified_at = CASE WHEN v_email_verified THEN COALESCE(email_verified_at, now()) ELSE NULL END,
    profile_completed_at = CASE WHEN v_profile_completed THEN COALESCE(profile_completed_at, now()) ELSE NULL END,
    crm_contact_id = v_contact.id,
    crm_customer_id = v_customer.id,
    portal_access_status = v_status,
    portal_access_note = v_note
  WHERE user_id = p_user_id RETURNING * INTO v_profile;

  RETURN QUERY SELECT
    v_profile.id, v_profile.portal_access_status,
    COALESCE(v_profile.portal_access_note, v_note),
    v_email_verified, v_profile_completed,
    v_profile.crm_contact_id, v_profile.crm_customer_id,
    v_customer.assigned_pricelist_id, v_profile.organization_name, v_customer.name,
    v_payment_terms;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_api_key(p_token text)
RETURNS TABLE(id uuid, scopes text[], name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_hash text;
  v_row public.api_keys%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN RETURN; END IF;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_row FROM public.api_keys WHERE key_hash = v_hash;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_row.revoked_at IS NOT NULL THEN RETURN; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RETURN; END IF;

  UPDATE public.api_keys SET last_used_at = now() WHERE api_keys.id = v_row.id;

  RETURN QUERY SELECT v_row.id, v_row.scopes, v_row.name;
END;
$$;

-- SECURITY DEFINER functions never remain executable by PUBLIC.
REVOKE ALL ON FUNCTION public.api_get_or_create_catalog_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_get_or_create_catalog_draft(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.can_access_customer_statement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_customer_statement(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_live_data_gateway_request(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_data_gateway_request(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.create_api_key(text, text[], timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_api_key(text, text[], timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.effective_price(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_price(integer, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_portal_erp_account_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_portal_erp_account_number() TO authenticated;
REVOKE ALL ON FUNCTION public.link_order_activity_contact() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_matrix() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_matrix() TO authenticated;
REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_updated_at() TO authenticated;
REVOKE ALL ON FUNCTION public.revert_account_to_master(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_account_to_master(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.revert_line_to_master(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_line_to_master(integer, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_api_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_api_key(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.set_custom_price(integer, uuid, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_custom_price(integer, uuid, numeric, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_master_price(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_master_price(uuid, numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.sync_customer_portal_identity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_customer_portal_identity(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.verify_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key(text) TO service_role;

-- SECURITY INVOKER helpers have only the call sites they require.
REVOKE ALL ON FUNCTION public.normalized_customer_account_number(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalized_customer_account_number(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.find_customer_by_account_number(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_customer_by_account_number(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.assign_customer_account_number(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_customer_account_number(integer, text) TO authenticated, service_role;

-- Source-equivalent R1 policies not already covered by an equal or narrower
-- Datamation policy. Former TO public policies that predicate on auth.uid()
-- or a role helper are tightened to TO authenticated without broadening access.
CREATE POLICY "Staff can select audit_log" ON "public"."audit_log"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Customers read own balance" ON "public"."balances"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ((can_access_customer_portal_feature(auth.uid(), 'statements'::text) AND (customer_id IN ( SELECT profiles.crm_customer_id
   FROM profiles
  WHERE (profiles.user_id = auth.uid())))));

CREATE POLICY "Role users can select cadence enrollments" ON "public"."cadence_enrollments"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Role users can select cadence steps" ON "public"."cadence_steps"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Role users can select cadences" ON "public"."cadences"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can delete catalog_assignments" ON "public"."catalog_assignments"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select catalog_assignments" ON "public"."catalog_assignments"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Authenticated users can read catalog page objects" ON "public"."catalog_page_objects"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated users can read catalog pages" ON "public"."catalog_pages"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "Admins can delete catalog_sections" ON "public"."catalog_sections"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select catalog_sections" ON "public"."catalog_sections"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can delete catalog_templates" ON "public"."catalog_templates"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select catalog_templates" ON "public"."catalog_templates"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can manage crm pipelines" ON "public"."crm_pipelines"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select crm pipelines" ON "public"."crm_pipelines"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can delete customers" ON "public"."customers"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can insert customers" ON "public"."customers"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update customers" ON "public"."customers"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Staff can select customers" ON "public"."customers"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Ticket owners can create messages" ON "public"."helpdesk_ticket_messages"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM helpdesk_tickets t
  WHERE ((t.id = helpdesk_ticket_messages.ticket_id) AND (t.owner_user_id = auth.uid())))));

CREATE POLICY "Ticket participants can read messages" ON "public"."helpdesk_ticket_messages"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM helpdesk_tickets t
  WHERE ((t.id = helpdesk_ticket_messages.ticket_id) AND ((t.owner_user_id = auth.uid()) OR (t.partner_contact_id IN ( SELECT p.crm_contact_id
           FROM profiles p
          WHERE ((p.user_id = auth.uid()) AND (p.crm_contact_id IS NOT NULL)))))))));

CREATE POLICY "Admins manage innovations_sync_dead_letters" ON "public"."innovations_sync_dead_letters"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage innovations_sync_runs" ON "public"."innovations_sync_runs"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete material_upgrades" ON "public"."material_upgrades"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can insert material_upgrades" ON "public"."material_upgrades"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update material_upgrades" ON "public"."material_upgrades"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select material_upgrades" ON "public"."material_upgrades"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can delete matrix_allocations" ON "public"."matrix_allocations"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select matrix_allocations" ON "public"."matrix_allocations"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can manage order activity" ON "public"."order_activity"
  AS PERMISSIVE FOR ALL TO authenticated
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select order activity" ON "public"."order_activity"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Role users can select outreach outbox" ON "public"."outreach_outbox"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can delete price_matrix" ON "public"."price_matrix"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select price_matrix" ON "public"."price_matrix"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Role users can select pricelist_catalog_rows" ON "public"."pricelist_catalog_rows"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can delete pricelist_child_sections" ON "public"."pricelist_child_sections"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert pricelist_child_sections" ON "public"."pricelist_child_sections"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_child_sections" ON "public"."pricelist_child_sections"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select pricelist_child_sections" ON "public"."pricelist_child_sections"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can delete pricelist_line_overrides" ON "public"."pricelist_line_overrides"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert pricelist_line_overrides" ON "public"."pricelist_line_overrides"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_line_overrides" ON "public"."pricelist_line_overrides"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select pricelist_line_overrides" ON "public"."pricelist_line_overrides"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors manage pricelist lines" ON "public"."pricelist_lines"
  AS PERMISSIVE FOR ALL TO "authenticated"
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete pricelist_notes" ON "public"."pricelist_notes"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can insert pricelist_notes" ON "public"."pricelist_notes"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_notes" ON "public"."pricelist_notes"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select pricelist_notes" ON "public"."pricelist_notes"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can delete pricelist_overrides" ON "public"."pricelist_overrides"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can insert pricelist_overrides" ON "public"."pricelist_overrides"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_overrides" ON "public"."pricelist_overrides"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select pricelist_overrides" ON "public"."pricelist_overrides"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can delete pricelist_versions" ON "public"."pricelist_versions"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select pricelist_versions" ON "public"."pricelist_versions"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors manage pricelists" ON "public"."pricelists"
  AS PERMISSIVE FOR ALL TO "authenticated"
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Staff can select pricing_settings" ON "public"."pricing_settings"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can update any profile" ON "public"."profiles"
  AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view all quote lines" ON "public"."quote_lines"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Staff can read all quotes" ON "public"."quotes"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Authenticated users can read rx_price_categories" ON "public"."rx_price_categories"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "Editors can delete rx_price_categories" ON "public"."rx_price_categories"
  AS PERMISSIVE FOR DELETE TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert rx_price_categories" ON "public"."rx_price_categories"
  AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update rx_price_categories" ON "public"."rx_price_categories"
  AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Authenticated users can read rx_price_category_versions" ON "public"."rx_price_category_versions"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "Editors can delete rx_price_category_versions" ON "public"."rx_price_category_versions"
  AS PERMISSIVE FOR DELETE TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert rx_price_category_versions" ON "public"."rx_price_category_versions"
  AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update rx_price_category_versions" ON "public"."rx_price_category_versions"
  AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Authenticated users can read rx_price_grouping_versions" ON "public"."rx_price_grouping_versions"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "Editors can delete rx_price_grouping_versions" ON "public"."rx_price_grouping_versions"
  AS PERMISSIVE FOR DELETE TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert rx_price_grouping_versions" ON "public"."rx_price_grouping_versions"
  AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update rx_price_grouping_versions" ON "public"."rx_price_grouping_versions"
  AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Authenticated users can read rx_price_groupings" ON "public"."rx_price_groupings"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "Editors can delete rx_price_groupings" ON "public"."rx_price_groupings"
  AS PERMISSIVE FOR DELETE TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert rx_price_groupings" ON "public"."rx_price_groupings"
  AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update rx_price_groupings" ON "public"."rx_price_groupings"
  AS PERMISSIVE FOR UPDATE TO "authenticated"
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Staff can select shipment_charges" ON "public"."shipment_charges"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Staff can select shipment_lines" ON "public"."shipment_lines"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Staff can select shipments" ON "public"."shipments"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Customers read own statement_lines" ON "public"."statement_lines"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ((can_access_customer_portal_feature(auth.uid(), 'statements'::text) AND (innovations_statement_id IN ( SELECT statements.innovations_statement_id
   FROM statements
  WHERE (statements.customer_id IN ( SELECT profiles.crm_customer_id
           FROM profiles
          WHERE (profiles.user_id = auth.uid())))))));

CREATE POLICY "store_product_media_read_authenticated" ON "public"."store_product_media"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "store_product_overrides_read_authenticated" ON "public"."store_product_overrides"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated staff can read store variants" ON "public"."store_product_variants"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Staff can read pageviews" ON "public"."website_analytics_pageviews"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Staff can read sessions" ON "public"."website_analytics_sessions"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Staff can read web_vitals" ON "public"."website_analytics_web_vitals"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (has_edit_role(auth.uid()));

NOTIFY pgrst, 'reload schema';
COMMIT;
