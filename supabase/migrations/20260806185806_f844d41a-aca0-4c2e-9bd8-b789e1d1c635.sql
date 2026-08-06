CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server-side/trusted contexts (no JWT) and staff may change privileged fields
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_edit_role(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.portal_access_status IS DISTINCT FROM OLD.portal_access_status
     OR NEW.portal_access_note IS DISTINCT FROM OLD.portal_access_note
     OR NEW.crm_contact_id IS DISTINCT FROM OLD.crm_contact_id
     OR NEW.crm_customer_id IS DISTINCT FROM OLD.crm_customer_id
     OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
     OR NEW.portal_access_approved_override IS DISTINCT FROM OLD.portal_access_approved_override
     OR NEW.portal_access_approved_by IS DISTINCT FROM OLD.portal_access_approved_by
     OR NEW.portal_access_approved_at IS DISTINCT FROM OLD.portal_access_approved_at
     OR NEW.portal_access_approved_note IS DISTINCT FROM OLD.portal_access_approved_note
     OR NEW.claimed_account_number IS DISTINCT FROM OLD.claimed_account_number
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.archived_by IS DISTINCT FROM OLD.archived_by
     OR NEW.portal_invite_email_sent_at IS DISTINCT FROM OLD.portal_invite_email_sent_at
     OR NEW.portal_invite_email_sent_by IS DISTINCT FROM OLD.portal_invite_email_sent_by THEN
    RAISE EXCEPTION 'Profile account-link and approval fields may only be changed by staff'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields_before_update ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields_before_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- Defense in depth: self-update policy also enforces privileged fields are unchanged
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_edit_role(auth.uid())
    OR (
      crm_customer_id IS NOT DISTINCT FROM (SELECT p.crm_customer_id FROM public.profiles p WHERE p.id = profiles.id)
      AND crm_contact_id IS NOT DISTINCT FROM (SELECT p.crm_contact_id FROM public.profiles p WHERE p.id = profiles.id)
      AND portal_access_status IS NOT DISTINCT FROM (SELECT p.portal_access_status FROM public.profiles p WHERE p.id = profiles.id)
      AND portal_access_approved_override IS NOT DISTINCT FROM (SELECT p.portal_access_approved_override FROM public.profiles p WHERE p.id = profiles.id)
    )
  )
);