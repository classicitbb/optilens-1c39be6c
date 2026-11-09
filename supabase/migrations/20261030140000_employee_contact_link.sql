-- Employees link to a CRM contact, and a contact that other business records
-- point at can no longer be deleted (archive it instead). The contact's own CRM
-- children (notes, activities, tags, enrichment, outreach) still cascade.
-- Also lets HR edit employee notes, keeping when they were last changed.

ALTER TABLE public.employees
  ADD COLUMN contact_id uuid UNIQUE REFERENCES public.contacts(id) ON DELETE RESTRICT;

ALTER TABLE public.employee_notes
  ADD COLUMN updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.employee_notes_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_notes_updated_at BEFORE UPDATE ON public.employee_notes
  FOR EACH ROW EXECUTE FUNCTION public.employee_notes_touch();

-- What a contact is linked to, as readable labels. Empty means it can be deleted.
CREATE OR REPLACE FUNCTION public.contact_link_kinds(_contact_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN EXISTS (SELECT 1 FROM public.employees WHERE contact_id = _contact_id) THEN 'employee' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.customers WHERE contact_id = _contact_id) THEN 'customer account' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.portal_account_memberships WHERE contact_id = _contact_id) THEN 'portal account' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.opportunities WHERE contact_id = _contact_id) THEN 'opportunity' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.helpdesk_tickets WHERE partner_contact_id = _contact_id) THEN 'helpdesk ticket' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.order_activity WHERE contact_id = _contact_id) THEN 'order' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.walk_in_payments WHERE contact_id = _contact_id) THEN 'walk-in payment' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.call_requests WHERE contact_id = _contact_id) THEN 'call request' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.call_recordings WHERE contact_id = _contact_id) THEN 'call recording' END,
    CASE WHEN EXISTS (SELECT 1 FROM public.copilot_actions WHERE contact_id = _contact_id) THEN 'copilot action' END
  ], NULL)
$$;

REVOKE ALL ON FUNCTION public.contact_link_kinds(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contact_link_kinds(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.contacts_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_links text[] := public.contact_link_kinds(OLD.id);
BEGIN
  IF cardinality(v_links) > 0 THEN
    RAISE EXCEPTION '% is linked to: %. Archive it instead of deleting.',
      coalesce(nullif(OLD.name, ''), OLD.business_name, 'This contact'), array_to_string(v_links, ', ')
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER contacts_delete_guard BEFORE DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.contacts_delete_guard();

-- Deletes the given contacts that are not linked and reports the rest, so a bulk
-- delete or purge does not fail as a whole on one linked contact. Runs as the
-- caller, so contacts RLS still decides who may delete.
CREATE OR REPLACE FUNCTION public.delete_unlinked_contacts(_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
  v_skipped jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', coalesce(nullif(c.name, ''), c.business_name), 'links', l.kinds)), '[]'::jsonb)
  INTO v_skipped
  FROM public.contacts c
  CROSS JOIN LATERAL (SELECT public.contact_link_kinds(c.id) AS kinds) l
  WHERE c.id = ANY(_ids) AND cardinality(l.kinds) > 0;

  DELETE FROM public.contacts c
  WHERE c.id = ANY(_ids) AND cardinality(public.contact_link_kinds(c.id)) = 0;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('deleted', v_deleted, 'skipped', v_skipped);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_unlinked_contacts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_unlinked_contacts(uuid[]) TO authenticated;
