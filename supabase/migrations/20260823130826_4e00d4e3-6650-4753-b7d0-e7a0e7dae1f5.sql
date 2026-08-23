CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.archived_by IS DISTINCT FROM OLD.archived_by
     OR NEW.portal_invite_email_sent_at IS DISTINCT FROM OLD.portal_invite_email_sent_at
     OR NEW.portal_invite_email_sent_by IS DISTINCT FROM OLD.portal_invite_email_sent_by THEN
    RAISE EXCEPTION 'Profile account-link and approval fields may only be changed by staff'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.claimed_account_number IS DISTINCT FROM OLD.claimed_account_number
     AND OLD.claimed_account_number IS NOT NULL THEN
    RAISE EXCEPTION 'Claimed account number may only be changed by staff'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_privileged_fields_match(
  _id uuid,
  _user_id uuid,
  _portal_access_status text,
  _portal_access_approved_override boolean,
  _crm_customer_id integer,
  _crm_contact_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _id
      AND p.user_id IS NOT DISTINCT FROM _user_id
      AND p.portal_access_status IS NOT DISTINCT FROM _portal_access_status
      AND p.portal_access_approved_override IS NOT DISTINCT FROM _portal_access_approved_override
      AND p.crm_customer_id IS NOT DISTINCT FROM _crm_customer_id
      AND p.crm_contact_id IS NOT DISTINCT FROM _crm_contact_id
  );
$$;

REVOKE ALL ON FUNCTION public.profile_privileged_fields_match(uuid, uuid, text, boolean, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_privileged_fields_match(uuid, uuid, text, boolean, integer, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Non-staff cannot change portal access or account linkage" ON public.profiles;
CREATE POLICY "Non-staff cannot change portal access or account linkage"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_edit_role(auth.uid())
  OR public.profile_privileged_fields_match(
       id, user_id, portal_access_status, portal_access_approved_override,
       crm_customer_id, crm_contact_id
     )
);