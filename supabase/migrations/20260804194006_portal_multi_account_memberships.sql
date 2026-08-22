-- One login may be authorized for several customer accounts.  The profile
-- remains the person's identity; this table becomes the account-access
-- authority. Existing single-account users are backfilled below.
CREATE TABLE public.portal_account_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  customer_id integer NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
    CONSTRAINT portal_account_memberships_status_check
    CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
  access_role text NOT NULL DEFAULT 'member'
    CONSTRAINT portal_account_memberships_access_role_check
    CHECK (access_role IN ('owner', 'manager', 'ordering', 'finance', 'member', 'viewer')),
  is_default boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'admin'
    CONSTRAINT portal_account_memberships_source_check
    CHECK (source IN ('admin', 'signup', 'migration', 'innovations_sync')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, customer_id)
);

CREATE INDEX portal_account_memberships_user_status_idx
  ON public.portal_account_memberships (user_id, status);
CREATE INDEX portal_account_memberships_customer_status_idx
  ON public.portal_account_memberships (customer_id, status);
CREATE UNIQUE INDEX portal_account_memberships_one_default_per_user_idx
  ON public.portal_account_memberships (user_id)
  WHERE is_default AND status = 'active';

CREATE TABLE public.portal_membership_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES public.portal_account_memberships(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, feature_key),
  CONSTRAINT portal_membership_feature_overrides_feature_key_check
    CHECK (feature_key IN ('quotes', 'helpdesk', 'pricelists', 'private-orders', 'live-order-status', 'statements', 'order-prices', 'lens-assistant'))
);

CREATE TABLE public.portal_account_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid REFERENCES public.portal_account_memberships(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id integer NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX portal_account_audit_subject_idx
  ON public.portal_account_audit_events (subject_user_id, created_at DESC);
CREATE INDEX portal_account_audit_customer_idx
  ON public.portal_account_audit_events (customer_id, created_at DESC);

ALTER TABLE public.portal_account_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_membership_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_account_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their portal account memberships"
  ON public.portal_account_memberships FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.has_edit_role((SELECT auth.uid())));

CREATE POLICY "Staff can manage portal account memberships"
  ON public.portal_account_memberships FOR ALL TO authenticated
  USING (public.has_edit_role((SELECT auth.uid())))
  WITH CHECK (public.has_edit_role((SELECT auth.uid())));

CREATE POLICY "Users can view their membership feature overrides"
  ON public.portal_membership_feature_overrides FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portal_account_memberships membership
    WHERE membership.id = membership_id
      AND (membership.user_id = (SELECT auth.uid()) OR public.has_edit_role((SELECT auth.uid())))
  ));

CREATE POLICY "Staff can manage membership feature overrides"
  ON public.portal_membership_feature_overrides FOR ALL TO authenticated
  USING (public.has_edit_role((SELECT auth.uid())))
  WITH CHECK (public.has_edit_role((SELECT auth.uid())));

CREATE POLICY "Staff can view portal account audit events"
  ON public.portal_account_audit_events FOR SELECT TO authenticated
  USING (public.has_edit_role((SELECT auth.uid())));

CREATE POLICY "Staff can create portal account audit events"
  ON public.portal_account_audit_events FOR INSERT TO authenticated
  WITH CHECK (public.has_edit_role((SELECT auth.uid())));

CREATE TRIGGER update_portal_account_memberships_updated_at
  BEFORE UPDATE ON public.portal_account_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portal_membership_feature_overrides_updated_at
  BEFORE UPDATE ON public.portal_membership_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A few historical/imported profiles may retain a CRM pointer after the
-- referenced contact or customer was removed. Do not weaken the membership
-- foreign keys or invent a replacement identity: report and skip those rows
-- so they can be repaired deliberately in Contacts.
DO $$
DECLARE
  v_orphaned_profile_count integer;
BEGIN
  SELECT count(*) INTO v_orphaned_profile_count
  FROM public.profiles profile
  LEFT JOIN public.contacts backfill_contact ON backfill_contact.id = profile.crm_contact_id
  LEFT JOIN public.customers backfill_customer ON backfill_customer.id = profile.crm_customer_id
  WHERE profile.crm_contact_id IS NOT NULL
    AND profile.crm_customer_id IS NOT NULL
    AND (backfill_contact.id IS NULL OR backfill_customer.id IS NULL);

  IF v_orphaned_profile_count > 0 THEN
    RAISE WARNING 'Skipped % portal profile(s) with orphaned CRM contact/customer links during membership backfill. Repair profiles.crm_contact_id/crm_customer_id in Contacts, then grant membership deliberately.', v_orphaned_profile_count;
  END IF;
END;
$$;

INSERT INTO public.portal_account_memberships (
  user_id, contact_id, customer_id, status, access_role, is_default, source,
  approved_by, approved_at
)
SELECT
  profile.user_id,
  profile.crm_contact_id,
  profile.crm_customer_id,
  CASE WHEN profile.portal_access_status = 'approved_customer' THEN 'active' ELSE 'pending' END,
  'member',
  profile.portal_access_status = 'approved_customer',
  'migration',
  profile.portal_access_approved_by,
  profile.portal_access_approved_at
FROM public.profiles profile
JOIN public.contacts backfill_contact ON backfill_contact.id = profile.crm_contact_id
JOIN public.customers backfill_customer ON backfill_customer.id = profile.crm_customer_id
ON CONFLICT (user_id, customer_id) DO NOTHING;

INSERT INTO public.portal_membership_feature_overrides (membership_id, feature_key, enabled)
SELECT membership.id, legacy.feature_key, legacy.enabled
FROM public.portal_account_memberships membership
JOIN public.customer_portal_feature_overrides legacy ON legacy.user_id = membership.user_id
ON CONFLICT (membership_id, feature_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.portal_membership_has_contact_tag(
  p_user_id uuid,
  p_customer_id integer,
  p_tag_names text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_user_id IS NULL OR p_customer_id IS NULL THEN false
      WHEN auth.uid() IS NOT NULL
        AND p_user_id <> auth.uid()
        AND NOT public.has_edit_role(auth.uid()) THEN false
      ELSE EXISTS (
        SELECT 1
        FROM public.portal_account_memberships membership
        JOIN public.contacts person ON person.id = membership.contact_id
        JOIN public.contact_tag_links link ON link.contact_id IN (
          membership.contact_id,
          person.parent_id,
          (SELECT customer.contact_id FROM public.customers customer WHERE customer.id = membership.customer_id)
        )
        JOIN public.contact_tags tag ON tag.id = link.tag_id
        WHERE membership.user_id = p_user_id
          AND membership.customer_id = p_customer_id
          AND membership.status = 'active'
          AND lower(btrim(tag.name)) = ANY (p_tag_names)
      )
    END;
$$;

REVOKE ALL ON FUNCTION public.portal_membership_has_contact_tag(uuid, integer, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_membership_has_contact_tag(uuid, integer, text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_portal_account(
  p_customer_id integer,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_user_id IS NULL OR p_customer_id IS NULL THEN false
    WHEN auth.uid() IS NOT NULL
      AND p_user_id <> auth.uid()
      AND NOT public.has_edit_role(auth.uid()) THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.portal_account_memberships membership
      WHERE membership.user_id = p_user_id
        AND membership.customer_id = p_customer_id
        AND membership.status = 'active'
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.can_access_portal_account(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_portal_account(integer, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_portal_account_feature(
  p_customer_id integer,
  p_feature_key text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership public.portal_account_memberships%ROWTYPE;
  v_override boolean;
BEGIN
  IF NOT public.can_access_portal_account(p_customer_id, p_user_id) THEN
    RETURN false;
  END IF;

  SELECT * INTO v_membership
  FROM public.portal_account_memberships
  WHERE user_id = p_user_id AND customer_id = p_customer_id AND status = 'active'
  LIMIT 1;

  SELECT enabled INTO v_override
  FROM public.portal_membership_feature_overrides
  WHERE membership_id = v_membership.id AND feature_key = p_feature_key;

  IF FOUND THEN RETURN v_override; END IF;

  IF p_feature_key = 'statements' THEN
    RETURN public.portal_membership_has_contact_tag(
      p_user_id, p_customer_id,
      ARRAY['approved access to statement', 'approved access to statements', 'ceo']
    );
  END IF;
  IF p_feature_key = 'pricelists' THEN
    RETURN public.portal_membership_has_contact_tag(
      p_user_id, p_customer_id,
      ARRAY['approved access to pricing', 'ceo']
    );
  END IF;
  IF p_feature_key = 'order-prices' THEN RETURN false; END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_portal_account_feature(integer, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_portal_account_feature(integer, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_portal_account_memberships(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  membership_id uuid,
  customer_id integer,
  contact_id uuid,
  customer_name text,
  account_number text,
  access_role text,
  membership_status text,
  is_default boolean,
  assigned_pricelist_id integer,
  payment_terms text,
  portal_orders_use_bill_to_account boolean,
  can_access_pricing boolean,
  can_access_statements boolean,
  feature_overrides jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    membership.id,
    membership.customer_id,
    membership.contact_id,
    customer.name,
    customer.account_number,
    membership.access_role,
    membership.status,
    membership.is_default,
    customer.assigned_pricelist_id,
    COALESCE((
      SELECT CASE
        WHEN bool_or(lower(btrim(tag.name)) = 'credit_approved') THEN 'credit_approved'
        WHEN bool_or(lower(btrim(tag.name)) = 'cash_only') THEN 'cash_only'
        ELSE 'standard'
      END
      FROM public.contact_tag_links payment_link
      JOIN public.contact_tags tag ON tag.id = payment_link.tag_id
      WHERE payment_link.contact_id = membership.contact_id
    ), 'standard'),
    customer.portal_orders_use_bill_to_account,
    public.can_access_portal_account_feature(customer.id, 'pricelists', p_user_id),
    public.can_access_portal_account_feature(customer.id, 'statements', p_user_id),
    COALESCE((
      SELECT jsonb_object_agg(override.feature_key, override.enabled)
      FROM public.portal_membership_feature_overrides override
      WHERE override.membership_id = membership.id
    ), '{}'::jsonb)
  FROM public.portal_account_memberships membership
  JOIN public.customers customer ON customer.id = membership.customer_id
  WHERE membership.user_id = p_user_id
    AND membership.status IN ('active', 'suspended')
    AND (
      p_user_id = auth.uid()
      OR public.has_edit_role(auth.uid())
      OR auth.uid() IS NULL
    )
  ORDER BY membership.is_default DESC, customer.name, customer.id;
$$;

REVOKE ALL ON FUNCTION public.get_portal_account_memberships(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_portal_account_memberships(uuid) TO authenticated, service_role;

GRANT SELECT ON public.portal_account_memberships TO authenticated;
GRANT SELECT ON public.portal_membership_feature_overrides TO authenticated;

NOTIFY pgrst, 'reload schema';
