-- can_access_customer_pricing / can_access_customer_statement only checked
-- tags on profiles.crm_contact_id itself. docs/portal-company-contact-identity-review.md
-- documents the intended model as: person contact, parent company contact,
-- OR the company customer contact can carry the granting tag — but that
-- inheritance was never implemented, so a person tagged only via their
-- parent company (a common real setup) was silently denied pricing/statement
-- access. This adds the parent contact and the customer's own linked
-- contact as additional places the granting tag can live.
CREATE OR REPLACE FUNCTION public.can_access_customer_pricing(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

  IF public.has_edit_role(p_user_id) THEN
    RETURN true;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND
     OR v_profile.portal_access_status <> 'approved_customer'
     OR v_profile.crm_contact_id IS NULL THEN
    RETURN false;
  END IF;

  -- Checks the person contact's own tags, its parent company contact's tags,
  -- and the tags on the company contact directly linked to the resolved
  -- customer account (profiles.crm_customer_id) -- these can differ from the
  -- parent_id chain when the link was resolved through linked_customer_id or
  -- an Innovations id instead of an explicit parent_id.
  RETURN EXISTS (
    SELECT 1
    FROM public.contact_tag_links link
    JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE lower(btrim(tag.name)) IN ('approved access to pricing', 'ceo')
      AND link.contact_id IN (
        SELECT contact_id FROM (
          SELECT v_profile.crm_contact_id AS contact_id
          UNION
          SELECT parent_id FROM public.contacts WHERE id = v_profile.crm_contact_id
          UNION
          SELECT contact_id FROM public.customers WHERE id = v_profile.crm_customer_id
        ) candidate_contacts
        WHERE contact_id IS NOT NULL
      )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_access_customer_statement(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

  IF public.has_edit_role(p_user_id) THEN
    RETURN true;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND
     OR v_profile.portal_access_status <> 'approved_customer'
     OR v_profile.crm_contact_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.contact_tag_links link
    JOIN public.contact_tags tag ON tag.id = link.tag_id
    WHERE lower(btrim(tag.name)) IN ('approved access to statement', 'approved access to statements', 'ceo')
      AND link.contact_id IN (
        SELECT contact_id FROM (
          SELECT v_profile.crm_contact_id AS contact_id
          UNION
          SELECT parent_id FROM public.contacts WHERE id = v_profile.crm_contact_id
          UNION
          SELECT contact_id FROM public.customers WHERE id = v_profile.crm_customer_id
        ) candidate_contacts
        WHERE contact_id IS NOT NULL
      )
  );
END;
$function$;

NOTIFY pgrst, 'reload schema';
