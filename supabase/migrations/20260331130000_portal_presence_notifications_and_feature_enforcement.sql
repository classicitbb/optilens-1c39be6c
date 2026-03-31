CREATE OR REPLACE FUNCTION public.can_access_customer_portal_feature(
  p_user_id uuid DEFAULT auth.uid(),
  p_feature_key text DEFAULT 'quotes'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_status text := 'pending_profile';
  v_override boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_feature_key NOT IN ('quotes', 'helpdesk', 'pricelists', 'private-orders') THEN
    RETURN false;
  END IF;

  IF public.has_edit_role(p_user_id) THEN
    RETURN true;
  END IF;

  PERFORM * FROM public.sync_customer_portal_identity(p_user_id);

  SELECT portal_access_status INTO v_status
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  SELECT enabled INTO v_override
  FROM public.customer_portal_feature_overrides
  WHERE user_id = p_user_id
    AND feature_key = p_feature_key
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  RETURN v_status = 'approved_customer';
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_customer_portal_feature(uuid, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_scope text NOT NULL DEFAULT 'customer',
  status text NOT NULL DEFAULT 'offline',
  availability_mode text NOT NULL DEFAULT 'available',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_presence_status_check CHECK (status IN ('online', 'idle', 'offline')),
  CONSTRAINT user_presence_role_scope_check CHECK (role_scope IN ('customer', 'staff', 'admin'))
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own presence" ON public.user_presence;
CREATE POLICY "Users can read own presence"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can upsert own presence" ON public.user_presence;
CREATE POLICY "Users can upsert own presence"
  ON public.user_presence FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.has_edit_role(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.has_edit_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.upsert_presence_heartbeat(
  p_status text DEFAULT 'online',
  p_role_scope text DEFAULT 'customer'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, role_scope, status, availability_mode, last_seen_at, last_heartbeat_at, updated_at)
  VALUES (auth.uid(), p_role_scope, p_status, CASE WHEN p_status = 'offline' THEN 'offline' ELSE 'available' END, now(), now(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET role_scope = EXCLUDED.role_scope,
      status = EXCLUDED.status,
      availability_mode = CASE WHEN EXCLUDED.status = 'offline' THEN 'offline' ELSE user_presence.availability_mode END,
      last_seen_at = now(),
      last_heartbeat_at = now(),
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_presence_heartbeat(text, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.admin_notification_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_id)
);

ALTER TABLE public.admin_notification_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification receipts" ON public.admin_notification_receipts;
CREATE POLICY "Users can view own notification receipts"
  ON public.admin_notification_receipts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can write own notification receipts" ON public.admin_notification_receipts;
CREATE POLICY "Users can write own notification receipts"
  ON public.admin_notification_receipts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Role users can select quotes" ON public.quotes;
CREATE POLICY "Users can read authorized quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    public.has_edit_role(auth.uid())
    OR (created_by = auth.uid() AND public.can_access_customer_portal_feature(auth.uid(), 'quotes'))
  );

DROP POLICY IF EXISTS "Editors can insert quotes" ON public.quotes;
CREATE POLICY "Users can insert authorized quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_edit_role(auth.uid())
    OR (created_by = auth.uid() AND public.can_access_customer_portal_feature(auth.uid(), 'quotes'))
  );

DROP POLICY IF EXISTS "Authenticated users can view helpdesk tickets" ON public.helpdesk_tickets;
CREATE POLICY "Users can read authorized helpdesk tickets"
  ON public.helpdesk_tickets FOR SELECT
  TO authenticated
  USING (
    public.has_edit_role(auth.uid())
    OR (
      public.can_access_customer_portal_feature(auth.uid(), 'helpdesk')
      AND (
        owner_user_id = auth.uid()
        OR partner_contact_id IN (
          SELECT crm_contact_id
          FROM public.profiles
          WHERE user_id = auth.uid()
            AND crm_contact_id IS NOT NULL
        )
      )
    )
  );

DROP POLICY IF EXISTS "Editors can insert helpdesk tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.helpdesk_tickets;
CREATE POLICY "Users can create authorized helpdesk tickets"
  ON public.helpdesk_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_edit_role(auth.uid())
    OR (
      public.can_access_customer_portal_feature(auth.uid(), 'helpdesk')
      AND owner_user_id = auth.uid()
    )
  );
