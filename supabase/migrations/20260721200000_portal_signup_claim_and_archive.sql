-- Smooth-onboarding foundation:
--  * claimed_account_number: the account number a customer types at signup.
--    It is a CLAIM only -- it feeds the admin approvals queue and is NEVER an
--    auto-approve path (account numbers appear on invoices, so a claim alone
--    must not grant access). An admin confirms the match with one click.
--  * archived_at / archived_by: a terminal resolution for a signup that will
--    never be approved (test accounts, spam, wrong-company). Archiving must
--    survive the next identity resync, so sync_customer_portal_identity
--    early-returns for archived profiles instead of recomputing their status.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS claimed_account_number text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sync_customer_portal_identity(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(profile_id uuid, portal_access_status text, portal_access_note text, email_verified boolean, profile_completed boolean, crm_contact_id uuid, crm_customer_id integer, assigned_pricelist_id integer, organization_name text, customer_name text, payment_terms text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user auth.users%ROWTYPE; v_profile public.profiles%ROWTYPE; v_contact public.contacts%ROWTYPE;
  v_parent_contact public.contacts%ROWTYPE; v_parent_company_id uuid; v_customer public.customers%ROWTYPE;
  v_email text; v_email_verified boolean := false; v_profile_completed boolean := false;
  v_manual_approved boolean := false; v_contact_found boolean := false; v_parent_contact_found boolean := false;
  v_customer_found boolean := false; v_status text := 'pending_profile';
  v_note text := 'Complete your profile to create your CRM contact.'; v_payment_terms text := 'standard';
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'sync_customer_portal_identity requires a user id'; END IF;
  SELECT * INTO v_user FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No auth user found for %', p_user_id; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN INSERT INTO public.profiles (user_id, email) VALUES (p_user_id, v_user.email) RETURNING * INTO v_profile; END IF;

  -- Archived profiles keep their frozen state through any resync. Nothing is
  -- recomputed; the admin must un-archive to reactivate the login's identity.
  IF v_profile.archived_at IS NOT NULL THEN
    RETURN QUERY SELECT v_profile.id, 'archived'::text,
      COALESCE(NULLIF(BTRIM(v_profile.portal_access_note), ''), 'This portal profile has been archived.'),
      v_profile.email_verified_at IS NOT NULL,
      v_profile.profile_completed_at IS NOT NULL,
      v_profile.crm_contact_id, v_profile.crm_customer_id,
      NULL::integer, v_profile.organization_name, NULL::text, 'standard'::text;
    RETURN;
  END IF;

  v_email := NULLIF(BTRIM(v_user.email), '');
  v_email_verified := v_user.email_confirmed_at IS NOT NULL;
  v_profile_completed := NULLIF(BTRIM(v_profile.full_name), '') IS NOT NULL AND NULLIF(BTRIM(v_profile.phone), '') IS NOT NULL;
  v_manual_approved := COALESCE(v_profile.portal_access_approved_override, false) AND v_profile.crm_customer_id IS NOT NULL;

  IF NULLIF(BTRIM(v_profile.organization_name), '') IS NOT NULL THEN
    SELECT id INTO v_parent_company_id FROM public.contacts
    WHERE is_company = true AND lower(name) = lower(BTRIM(v_profile.organization_name))
    ORDER BY is_customer DESC, linked_customer_id NULLS LAST, updated_at DESC LIMIT 1;
  END IF;

  IF v_email_verified AND (v_profile_completed OR v_manual_approved) THEN
    IF v_profile.crm_contact_id IS NOT NULL THEN
      SELECT * INTO v_contact FROM public.contacts WHERE id = v_profile.crm_contact_id;
      v_contact_found := FOUND;
    END IF;

    IF v_profile_completed THEN
      IF NOT v_contact_found AND v_email IS NOT NULL THEN
        SELECT * INTO v_contact FROM public.contacts WHERE lower(COALESCE(email, '')) = lower(v_email)
        ORDER BY is_customer DESC, linked_customer_id NULLS LAST, updated_at DESC LIMIT 1;
        v_contact_found := FOUND;
      END IF;
      IF NOT v_contact_found THEN
        INSERT INTO public.contacts (name, email, phone, is_company, type, business_name, parent_id, country, status, is_customer, pipeline_stage)
        VALUES (COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), COALESCE(v_email, 'Customer contact')), v_email,
          NULLIF(BTRIM(v_profile.phone), ''), false, 'individual', NULLIF(BTRIM(v_profile.organization_name), ''),
          v_parent_company_id, 'Barbados', 'lead', false, 'New') RETURNING * INTO v_contact;
        v_contact_found := true;
      ELSE
        UPDATE public.contacts SET
          name = COALESCE(NULLIF(BTRIM(v_contact.name), ''), NULLIF(BTRIM(v_profile.full_name), '')),
          email = COALESCE(NULLIF(BTRIM(v_contact.email), ''), v_email),
          phone = COALESCE(NULLIF(BTRIM(v_contact.phone), ''), NULLIF(BTRIM(v_profile.phone), '')),
          type = CASE WHEN v_contact.is_company THEN v_contact.type ELSE 'individual' END,
          business_name = COALESCE(NULLIF(BTRIM(v_contact.business_name), ''), NULLIF(BTRIM(v_profile.organization_name), '')),
          parent_id = COALESCE(v_contact.parent_id, v_parent_company_id)
        WHERE id = v_contact.id RETURNING * INTO v_contact;
        v_contact_found := true;
      END IF;
    END IF;

    IF v_contact_found AND v_contact.parent_id IS NOT NULL THEN
      SELECT * INTO v_parent_contact FROM public.contacts WHERE id = v_contact.parent_id;
      v_parent_contact_found := FOUND;
    END IF;
    IF v_contact_found THEN
      SELECT t.name INTO v_payment_terms FROM public.contact_tag_links l JOIN public.contact_tags t ON t.id = l.tag_id
      WHERE l.contact_id = v_contact.id AND t.name IN ('credit_approved', 'cash_only')
      ORDER BY CASE t.name WHEN 'credit_approved' THEN 0 ELSE 1 END LIMIT 1;
      v_payment_terms := COALESCE(v_payment_terms, 'standard');
    END IF;

    IF v_profile.crm_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers WHERE id = v_profile.crm_customer_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_contact_found AND v_contact.linked_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers WHERE id = v_contact.linked_customer_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_contact_found AND v_contact.innovations_parent_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers WHERE innovations_customer_id = v_contact.innovations_parent_customer_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_parent_contact_found AND v_parent_contact.linked_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers WHERE id = v_parent_contact.linked_customer_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_parent_contact_found AND v_parent_contact.innovations_parent_customer_id IS NOT NULL THEN
      SELECT * INTO v_customer FROM public.customers WHERE innovations_customer_id = v_parent_contact.innovations_parent_customer_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_contact_found THEN
      SELECT * INTO v_customer FROM public.customers WHERE contact_id = v_contact.id AND (innovations_customer_id IS NOT NULL OR NULLIF(BTRIM(account_number), '') IS NOT NULL)
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_parent_contact_found THEN
      SELECT * INTO v_customer FROM public.customers WHERE contact_id = v_parent_contact.id AND (innovations_customer_id IS NOT NULL OR NULLIF(BTRIM(account_number), '') IS NOT NULL)
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_contact_found THEN
      SELECT * INTO v_customer FROM public.customers WHERE contact_id = v_contact.id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_parent_contact_found THEN
      SELECT * INTO v_customer FROM public.customers WHERE contact_id = v_parent_contact.id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1; v_customer_found := FOUND;
    END IF;
    IF NOT v_customer_found AND v_contact_found AND v_contact.is_customer THEN
      INSERT INTO public.customers (name, email, phone, address, type, pipeline_stage, contact_id)
      VALUES (v_contact.name, NULLIF(v_contact.email, ''), v_contact.phone, NULLIF(v_contact.address, ''), 'Customer', COALESCE(NULLIF(v_contact.pipeline_stage, ''), 'Prospect'), v_contact.id)
      RETURNING * INTO v_customer; v_customer_found := true;
    END IF;

    IF v_customer_found AND v_customer.id IS NOT NULL THEN
      v_status := 'approved_customer';
      v_note := CASE WHEN v_manual_approved AND NOT v_profile_completed THEN COALESCE(NULLIF(BTRIM(v_profile.portal_access_approved_note), ''), 'Your account has been approved for portal access by Classic Visions.')
        ELSE 'Your account is approved for quotes, helpdesk, pricelists, private-order workflows, and account statements.' END;
      INSERT INTO public.user_roles (user_id, role) SELECT p_user_id, 'customer'::public.app_role
      WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id) ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      v_status := 'pending_approval'; v_note := 'Your CRM contact is ready. Customer-only workflows unlock after team approval.';
    END IF;
  ELSIF NOT v_email_verified THEN
    v_status := 'pending_verification'; v_note := 'Verify your email address to activate your CRM contact and customer workflow.';
  ELSE
    v_status := 'pending_profile'; v_note := 'Complete your profile with your full name and phone number to activate your CRM contact.';
  END IF;

  UPDATE public.profiles SET
    email = COALESCE(v_email, email),
    email_verified_at = CASE WHEN v_email_verified THEN COALESCE(email_verified_at, now()) ELSE email_verified_at END,
    profile_completed_at = CASE WHEN v_profile_completed THEN COALESCE(profile_completed_at, now()) ELSE profile_completed_at END,
    crm_contact_id = COALESCE(v_contact.id, v_profile.crm_contact_id),
    crm_customer_id = COALESCE(v_customer.id, v_profile.crm_customer_id),
    portal_access_status = v_status, portal_access_note = v_note
  WHERE user_id = p_user_id RETURNING * INTO v_profile;

  RETURN QUERY SELECT v_profile.id, v_profile.portal_access_status, COALESCE(v_profile.portal_access_note, v_note),
    v_email_verified, v_profile_completed, v_profile.crm_contact_id, v_profile.crm_customer_id,
    v_customer.assigned_pricelist_id, v_profile.organization_name, v_customer.name, v_payment_terms;
END;
$function$;

NOTIFY pgrst, 'reload schema';
