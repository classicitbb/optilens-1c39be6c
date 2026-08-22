-- A CRM company can be resolved to the portal customer through
-- contacts.linked_customer_id even when customers.contact_id is empty or
-- points at a different synchronized record. Include that canonical CRM
-- relationship when deciding whether an Is Lab tag grants portal pricing.
CREATE OR REPLACE FUNCTION public.can_access_customer_lab_pricing(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND OR v_profile.crm_contact_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.contact_tag_links link
    INNER JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE lower(btrim(tag.name)) = 'is lab'
      AND link.contact_id IN (
        SELECT contact_id
        FROM (
          SELECT v_profile.crm_contact_id AS contact_id
          UNION
          SELECT parent_id FROM public.contacts WHERE id = v_profile.crm_contact_id
          UNION
          SELECT contact_id FROM public.customers WHERE id = v_profile.crm_customer_id
          UNION
          SELECT id FROM public.contacts WHERE linked_customer_id = v_profile.crm_customer_id
        ) candidate_contacts
        WHERE contact_id IS NOT NULL
      )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_access_customer_lab_pricing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_customer_lab_pricing(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
