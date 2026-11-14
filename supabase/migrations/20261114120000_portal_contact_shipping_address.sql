-- Checkout address <-> CRM contact.
-- Portal customers cannot read or write public.contacts (staff-only RLS), so
-- checkout reaches the signed-in customer's OWN contact through two
-- SECURITY DEFINER functions. Both prove the contact belongs to the caller
-- (an active portal membership, or profiles.crm_contact_id) before touching
-- it, and expose or change address columns only.

CREATE OR REPLACE FUNCTION public.portal_user_owns_contact(p_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_contact_id IS NOT NULL AND auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.portal_account_memberships m
      WHERE m.user_id = auth.uid() AND m.contact_id = p_contact_id AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.user_id = auth.uid() AND pr.crm_contact_id = p_contact_id
    )
  );
$$;

REVOKE ALL ON FUNCTION public.portal_user_owns_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_user_owns_contact(uuid) TO authenticated, service_role;

-- Address on file for the caller's contact. Falls back to the parent company
-- record when the person's own contact has no street address.
CREATE OR REPLACE FUNCTION public.get_my_contact_shipping_address(p_contact_id uuid)
RETURNS TABLE (
  source text,
  recipient text,
  phone text,
  street text,
  street2 text,
  city text,
  state text,
  zip text,
  country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN c.id = p_contact_id THEN 'contact' ELSE 'company' END,
    own.name,
    own.phone,
    COALESCE(c.street, ''),
    COALESCE(c.street2, ''),
    COALESCE(c.city, ''),
    COALESCE(c.state, ''),
    COALESCE(c.zip, ''),
    COALESCE(c.country, '')
  FROM public.contacts own
  JOIN public.contacts c
    ON c.id IN (own.id, own.parent_id)
  WHERE own.id = p_contact_id
    AND public.portal_user_owns_contact(p_contact_id)
    AND btrim(COALESCE(c.street, '')) <> ''
  ORDER BY (c.id = own.id) DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_contact_shipping_address(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_contact_shipping_address(uuid) TO authenticated, service_role;

-- Customer typed a new address at checkout: store it on their own contact.
CREATE OR REPLACE FUNCTION public.update_my_contact_shipping_address(
  p_contact_id uuid,
  p_street text,
  p_street2 text,
  p_city text,
  p_state text,
  p_zip text,
  p_country text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.portal_user_owns_contact(p_contact_id) THEN
    RAISE EXCEPTION 'That contact does not belong to this login.' USING ERRCODE = '42501';
  END IF;
  IF btrim(COALESCE(p_street, '')) = '' THEN
    RAISE EXCEPTION 'A street address is required.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.contacts
  SET street = btrim(p_street),
      street2 = NULLIF(btrim(COALESCE(p_street2, '')), ''),
      city = NULLIF(btrim(COALESCE(p_city, '')), ''),
      state = NULLIF(btrim(COALESCE(p_state, '')), ''),
      zip = NULLIF(btrim(COALESCE(p_zip, '')), ''),
      country = COALESCE(NULLIF(btrim(COALESCE(p_country, '')), ''), country),
      updated_at = now()
  WHERE id = p_contact_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_contact_shipping_address(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_contact_shipping_address(uuid, text, text, text, text, text, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
