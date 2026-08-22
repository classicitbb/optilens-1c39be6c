CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
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
    RAISE EXCEPTION 'Profile account-link and approval fields may only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profile_privileged_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_privileged_fields() TO service_role;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields_before_update ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields_before_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privileged_fields();

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);