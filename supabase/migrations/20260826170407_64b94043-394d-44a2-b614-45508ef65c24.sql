CREATE TABLE public.runtime_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text,
  source text NOT NULL,
  title text NOT NULL,
  detail text,
  component_stack text,
  release_version text,
  user_agent text,
  browser text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX runtime_error_events_created_at_idx
  ON public.runtime_error_events (created_at DESC);

GRANT SELECT, INSERT ON public.runtime_error_events TO authenticated;
GRANT ALL ON public.runtime_error_events TO service_role;

ALTER TABLE public.runtime_error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own runtime error events"
  ON public.runtime_error_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Staff can view runtime error events"
  ON public.runtime_error_events FOR SELECT TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Backfill existing admin/operator users with an active Retail (customer 776) membership.
DO $$
DECLARE
  v_retail_customer_id integer := 776;
  v_retail_contact_id uuid := 'aacac4f5-efbe-40b2-b9e5-29b7555a5781'::uuid;
  v_retail_found integer;
BEGIN
  SELECT count(*) INTO v_retail_found
  FROM public.customers
  WHERE id = v_retail_customer_id AND contact_id = v_retail_contact_id;

  IF v_retail_found = 0 THEN
    RAISE EXCEPTION 'Retail customer (id=776, contact_id=aacac4f5-efbe-40b2-b9e5-29b7555a5781) not found';
  END IF;

  INSERT INTO public.portal_account_memberships (
    user_id, contact_id, customer_id, status, access_role, is_default, source, approved_at
  )
  SELECT
    ur.user_id,
    v_retail_contact_id,
    v_retail_customer_id,
    'active',
    'manager',
    NOT EXISTS (
      SELECT 1 FROM public.portal_account_memberships existing
      WHERE existing.user_id = ur.user_id AND existing.status = 'active'
    ),
    'admin',
    now()
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'operator')
    AND NOT EXISTS (
      SELECT 1 FROM public.portal_account_memberships existing
      WHERE existing.user_id = ur.user_id
        AND existing.customer_id = v_retail_customer_id
    )
  ON CONFLICT (user_id, customer_id) DO NOTHING;

  INSERT INTO public.portal_account_audit_events (
    subject_user_id, actor_user_id, customer_id, event_type, metadata
  )
  SELECT
    ur.user_id,
    null,
    v_retail_customer_id,
    'staff_retail_membership_backfill',
    jsonb_build_object('role', ur.role, 'source', 'migration')
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'operator')
    AND EXISTS (
      SELECT 1 FROM public.portal_account_memberships membership
      WHERE membership.user_id = ur.user_id
        AND membership.customer_id = v_retail_customer_id
    );
END;
$$;

-- Trigger function: when a user is granted admin or operator, give them Retail access.
CREATE OR REPLACE FUNCTION public.ensure_staff_retail_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retail_customer_id integer := 776;
  v_retail_contact_id uuid := 'aacac4f5-efbe-40b2-b9e5-29b7555a5781'::uuid;
BEGIN
  IF NEW.role IN ('admin', 'operator') THEN
    INSERT INTO public.portal_account_memberships (
      user_id, contact_id, customer_id, status, access_role, is_default, source, approved_at
    )
    VALUES (
      NEW.user_id,
      v_retail_contact_id,
      v_retail_customer_id,
      'active',
      'manager',
      NOT EXISTS (
        SELECT 1 FROM public.portal_account_memberships existing
        WHERE existing.user_id = NEW.user_id AND existing.status = 'active'
      ),
      'admin',
      now()
    )
    ON CONFLICT (user_id, customer_id) DO UPDATE SET
      status = 'active',
      access_role = 'manager',
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_staff_retail_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_staff_retail_membership() TO authenticated, service_role;

CREATE TRIGGER ensure_staff_retail_membership_trigger
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_staff_retail_membership();

NOTIFY pgrst, 'reload schema';