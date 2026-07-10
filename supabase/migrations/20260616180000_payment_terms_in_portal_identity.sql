-- Add payment_terms to sync_customer_portal_identity.
-- Returns 'credit_approved' for contacts tagged credit_approved (Net-30 eligible),
-- 'cash_only' for contacts tagged cash_only (prepay only), or 'standard' otherwise.

CREATE OR REPLACE FUNCTION public.sync_customer_portal_identity(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  profile_id uuid,
  portal_access_status text,
  portal_access_note text,
  email_verified boolean,
  profile_completed boolean,
  crm_contact_id uuid,
  crm_customer_id integer,
  assigned_pricelist_id integer,
  organization_name text,
  customer_name text,
  payment_terms text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_contact public.contacts%ROWTYPE;
  v_parent_company_id uuid;
  v_customer public.customers%ROWTYPE;
  v_email text;
  v_email_verified boolean := false;
  v_profile_completed boolean := false;
  v_contact_found boolean := false;
  v_customer_found boolean := false;
  v_status text := 'pending_profile';
  v_note text := 'Complete your profile to create your CRM contact.';
  v_payment_terms text := 'standard';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'sync_customer_portal_identity requires a user id';
  END IF;

  SELECT * INTO v_user
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No auth user found for %', p_user_id;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, email)
    VALUES (p_user_id, v_user.email)
    RETURNING * INTO v_profile;
  END IF;

  v_email := NULLIF(BTRIM(v_user.email), '');
  v_email_verified := v_user.email_confirmed_at IS NOT NULL;
  v_profile_completed := COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), NULL) IS NOT NULL
    AND COALESCE(NULLIF(BTRIM(v_profile.phone), ''), NULL) IS NOT NULL;

  IF COALESCE(NULLIF(BTRIM(v_profile.organization_name), ''), NULL) IS NOT NULL THEN
    SELECT id
    INTO v_parent_company_id
    FROM public.contacts
    WHERE is_company = true
      AND lower(name) = lower(BTRIM(v_profile.organization_name))
    ORDER BY is_customer DESC, updated_at DESC
    LIMIT 1;
  END IF;

  IF v_email_verified AND v_profile_completed THEN
    IF v_profile.crm_contact_id IS NOT NULL THEN
      SELECT * INTO v_contact
      FROM public.contacts
      WHERE id = v_profile.crm_contact_id;
      v_contact_found := FOUND;
    END IF;

    IF NOT v_contact_found AND v_email IS NOT NULL THEN
      SELECT * INTO v_contact
      FROM public.contacts
      WHERE lower(COALESCE(email, '')) = lower(v_email)
      ORDER BY is_customer DESC, updated_at DESC
      LIMIT 1;
      v_contact_found := FOUND;
    END IF;

    IF NOT v_contact_found THEN
      INSERT INTO public.contacts (
        name,
        email,
        phone,
        is_company,
        type,
        business_name,
        parent_id,
        country,
        status,
        is_customer,
        pipeline_stage
      )
      VALUES (
        COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), COALESCE(v_email, 'Customer contact')),
        v_email,
        NULLIF(BTRIM(v_profile.phone), ''),
        false,
        'individual',
        NULLIF(BTRIM(v_profile.organization_name), ''),
        v_parent_company_id,
        'Barbados',
        'lead',
        false,
        'New'
      )
      RETURNING * INTO v_contact;
      v_contact_found := true;
    ELSE
      UPDATE public.contacts
      SET
        name = COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), v_contact.name),
        email = COALESCE(v_email, v_contact.email),
        phone = COALESCE(NULLIF(BTRIM(v_profile.phone), ''), v_contact.phone),
        type = CASE WHEN v_contact.is_company THEN v_contact.type ELSE 'individual' END,
        business_name = COALESCE(NULLIF(BTRIM(v_profile.organization_name), ''), v_contact.business_name),
        parent_id = COALESCE(v_parent_company_id, v_contact.parent_id)
      WHERE id = v_contact.id
      RETURNING * INTO v_contact;
      v_contact_found := true;
    END IF;

    -- Resolve payment terms from contact tags (credit_approved wins over cash_only).
    SELECT t.name INTO v_payment_terms
    FROM public.contact_tag_links l
    JOIN public.contact_tags t ON t.id = l.tag_id
    WHERE l.contact_id = v_contact.id
      AND t.name IN ('credit_approved', 'cash_only')
    ORDER BY CASE t.name WHEN 'credit_approved' THEN 0 ELSE 1 END
    LIMIT 1;
    v_payment_terms := COALESCE(v_payment_terms, 'standard');

    IF v_contact.is_customer THEN
      SELECT * INTO v_customer
      FROM public.customers
      WHERE contact_id = v_contact.id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 1;
      v_customer_found := FOUND;

      IF NOT v_customer_found THEN
        INSERT INTO public.customers (
          name,
          email,
          phone,
          address,
          type,
          pipeline_stage,
          contact_id
        )
        VALUES (
          v_contact.name,
          v_contact.email,
          v_contact.phone,
          NULLIF(v_contact.address, ''),
          CASE WHEN v_contact.is_company THEN 'Company' ELSE 'Person' END,
          COALESCE(NULLIF(v_contact.pipeline_stage, ''), 'Prospect'),
          v_contact.id
        )
        RETURNING * INTO v_customer;
        v_customer_found := true;
      END IF;
    ELSE
      SELECT * INTO v_customer
      FROM public.customers
      WHERE contact_id = v_contact.id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    IF v_customer_found AND v_customer.id IS NOT NULL THEN
      v_status := 'approved_customer';
      v_note := 'Your account is approved for quotes, helpdesk, pricelists, and private-order workflows.';
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

  UPDATE public.profiles
  SET
    email = COALESCE(v_email, email),
    email_verified_at = CASE WHEN v_email_verified THEN COALESCE(email_verified_at, now()) ELSE NULL END,
    profile_completed_at = CASE WHEN v_profile_completed THEN COALESCE(profile_completed_at, now()) ELSE NULL END,
    crm_contact_id = v_contact.id,
    crm_customer_id = v_customer.id,
    portal_access_status = v_status,
    portal_access_note = v_note
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;

  RETURN QUERY
  SELECT
    v_profile.id,
    v_profile.portal_access_status,
    COALESCE(v_profile.portal_access_note, v_note),
    v_email_verified,
    v_profile_completed,
    v_profile.crm_contact_id,
    v_profile.crm_customer_id,
    v_customer.assigned_pricelist_id,
    v_profile.organization_name,
    v_customer.name,
    v_payment_terms;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_customer_portal_identity(uuid) TO authenticated;
