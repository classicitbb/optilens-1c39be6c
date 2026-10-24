-- Helpdesk ticket audience.
--
-- A ticket's partner_contact_id decides who it is for:
--   * a company contact  -> the whole account: the company, its child contacts
--                           (contacts.parent_id) and active portal members of
--                           customers linked to it (customers.contact_id).
--   * a person contact   -> that person only (their contact email and portal
--                           login). Colleagues at the same company never see it.
-- Tickets can be lodged against an account with no portal; anyone who later
-- joins that account inherits its account-wide tickets through the same rules.

-- ---------------------------------------------------------------------------
-- Recipients for a contact (used to email a ticket's audience and to preview
-- recipients in the create dialog). Staff and service role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.helpdesk_contact_recipients(p_contact_id uuid)
RETURNS TABLE (contact_id uuid, email text, name text, account_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_target public.contacts%ROWTYPE;
  v_account public.contacts%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_target FROM public.contacts WHERE id = p_contact_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_account := v_target;
  IF NOT v_target.is_company AND v_target.parent_id IS NOT NULL THEN
    SELECT * INTO v_account FROM public.contacts WHERE id = v_target.parent_id;
  END IF;

  RETURN QUERY
  WITH scope AS (
    SELECT v_target.id AS id
    UNION
    SELECT child.id
    FROM public.contacts child
    WHERE v_target.is_company
      AND child.parent_id = v_target.id
      AND NOT COALESCE(child.is_archived, false)
  ),
  candidates AS (
    SELECT c.id, c.email, c.name
    FROM public.contacts c
    JOIN scope ON scope.id = c.id
    UNION ALL
    SELECT scope.id, p.email, p.full_name
    FROM public.profiles p
    JOIN scope ON scope.id = p.crm_contact_id
    UNION ALL
    SELECT m.contact_id, p.email, p.full_name
    FROM public.portal_account_memberships m
    JOIN public.profiles p ON p.user_id = m.user_id
    WHERE m.status = 'active'
      AND (
        m.contact_id IN (SELECT id FROM scope)
        OR (v_target.is_company AND m.customer_id IN (
          SELECT cu.id FROM public.customers cu WHERE cu.contact_id = v_target.id
        ))
      )
  )
  SELECT DISTINCT ON (lower(btrim(candidates.email)))
    candidates.id,
    btrim(candidates.email),
    NULLIF(btrim(candidates.name), ''),
    COALESCE(NULLIF(btrim(v_account.business_name), ''), v_account.name)
  FROM candidates
  WHERE candidates.email IS NOT NULL
    AND btrim(candidates.email) LIKE '%_@_%'
  ORDER BY lower(btrim(candidates.email)), candidates.id;
END;
$$;

REVOKE ALL ON FUNCTION public.helpdesk_contact_recipients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.helpdesk_contact_recipients(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.helpdesk_ticket_recipients(p_ticket_id uuid)
RETURNS TABLE (contact_id uuid, email text, name text, account_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.helpdesk_tickets t
  CROSS JOIN LATERAL public.helpdesk_contact_recipients(t.partner_contact_id) r
  WHERE t.id = p_ticket_id
    AND t.partner_contact_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.helpdesk_ticket_recipients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.helpdesk_ticket_recipients(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Contacts whose tickets a portal user may see: their own contact(s), plus the
-- company contacts of the accounts they belong to. A user may ask about
-- themselves; staff may ask about anyone (Website Portals, "view as").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.helpdesk_visible_contact_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH allowed AS (
    SELECT 1 WHERE p_user_id = auth.uid() OR public.has_edit_role(auth.uid())
  ),
  mine AS (
    SELECT p.crm_contact_id AS id
    FROM public.profiles p, allowed
    WHERE p.user_id = p_user_id AND p.crm_contact_id IS NOT NULL
    UNION
    SELECT m.contact_id
    FROM public.portal_account_memberships m, allowed
    WHERE m.user_id = p_user_id AND m.status = 'active'
  )
  SELECT id FROM mine
  UNION
  SELECT company.id
  FROM mine
  JOIN public.contacts person ON person.id = mine.id
  JOIN public.contacts company ON company.id = person.parent_id AND company.is_company
  UNION
  SELECT cu.contact_id
  FROM public.portal_account_memberships m
  JOIN public.customers cu ON cu.id = m.customer_id
  CROSS JOIN allowed
  WHERE m.user_id = p_user_id AND m.status = 'active' AND cu.contact_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.helpdesk_visible_contact_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.helpdesk_visible_contact_ids(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can read authorized helpdesk tickets" ON public.helpdesk_tickets;
CREATE POLICY "Users can read authorized helpdesk tickets" ON public.helpdesk_tickets
  FOR SELECT TO authenticated
  USING (
    public.has_edit_role(auth.uid())
    OR (
      public.can_access_customer_portal_feature(auth.uid(), 'helpdesk'::text)
      AND (
        owner_user_id = auth.uid()
        OR partner_contact_id IN (SELECT public.helpdesk_visible_contact_ids(auth.uid()))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- "You've joined an account with open tickets" notifications. Triggers only
-- enqueue; helpdesk-notify-worker sends (no network calls inside inserts).
-- One notice per person per account, ever.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.helpdesk_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'account_open_tickets'
    CONSTRAINT helpdesk_notification_queue_kind_check CHECK (kind IN ('account_open_tickets')),
  account_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  skipped_reason text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS helpdesk_notification_queue_once_idx
  ON public.helpdesk_notification_queue (kind, account_contact_id, lower(recipient_email));
CREATE INDEX IF NOT EXISTS helpdesk_notification_queue_pending_idx
  ON public.helpdesk_notification_queue (created_at)
  WHERE sent_at IS NULL AND skipped_reason IS NULL;

ALTER TABLE public.helpdesk_notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can read helpdesk notification queue" ON public.helpdesk_notification_queue;
CREATE POLICY "Staff can read helpdesk notification queue" ON public.helpdesk_notification_queue
  FOR SELECT TO authenticated
  USING (public.has_edit_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.helpdesk_enqueue_account_notice(p_account_contact_id uuid, p_email text, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_account_contact_id IS NULL OR p_email IS NULL OR btrim(p_email) NOT LIKE '%_@_%' THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.helpdesk_tickets t
    JOIN public.contacts account ON account.id = t.partner_contact_id AND account.is_company
    WHERE t.partner_contact_id = p_account_contact_id AND t.closed_at IS NULL
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.helpdesk_notification_queue (account_contact_id, recipient_email, recipient_name)
  VALUES (p_account_contact_id, btrim(p_email), NULLIF(btrim(p_name), ''))
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.helpdesk_enqueue_account_notice(uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.helpdesk_contact_joined_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL
     AND NOT COALESCE(NEW.is_company, false)
     AND NOT COALESCE(NEW.is_archived, false)
     AND (TG_OP = 'INSERT' OR NEW.parent_id IS DISTINCT FROM OLD.parent_id OR NEW.email IS DISTINCT FROM OLD.email) THEN
    PERFORM public.helpdesk_enqueue_account_notice(NEW.parent_id, NEW.email, NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_contact_joined_account ON public.contacts;
CREATE TRIGGER helpdesk_contact_joined_account
  AFTER INSERT OR UPDATE OF parent_id, email ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.helpdesk_contact_joined_account();

CREATE OR REPLACE FUNCTION public.helpdesk_member_joined_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account uuid;
  v_email text;
  v_name text;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT cu.contact_id INTO v_account FROM public.customers cu WHERE cu.id = NEW.customer_id;
    SELECT p.email, p.full_name INTO v_email, v_name FROM public.profiles p WHERE p.user_id = NEW.user_id;
    PERFORM public.helpdesk_enqueue_account_notice(v_account, v_email, v_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS helpdesk_member_joined_account ON public.portal_account_memberships;
CREATE TRIGGER helpdesk_member_joined_account
  AFTER INSERT OR UPDATE OF status ON public.portal_account_memberships
  FOR EACH ROW EXECUTE FUNCTION public.helpdesk_member_joined_account();

-- ---------------------------------------------------------------------------
-- Schedule helpdesk-notify-worker every 15 minutes.
-- PREREQUISITES — this block no-ops until both vault secrets exist:
--   SELECT vault.create_secret('<HELPDESK_SCHEDULER_SECRET value>', 'helpdesk_scheduler_secret');
--   SELECT vault.create_secret('https://<project-ref>.supabase.co/functions/v1/helpdesk-notify-worker',
--                              'helpdesk_notify_worker_url');
-- To revert: SELECT cron.unschedule('helpdesk_notify_worker');
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_cron/pg_net not installed; helpdesk_notify_worker not scheduled.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'cron' AND table_name = 'job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'helpdesk_notify_worker';
  END IF;

  BEGIN
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'helpdesk_scheduler_secret';
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'helpdesk_notify_worker_url';
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
    v_url := NULL;
  END;

  IF v_secret IS NULL OR btrim(v_secret) = '' OR v_url IS NULL OR btrim(v_url) = '' THEN
    RAISE NOTICE 'helpdesk_scheduler_secret / helpdesk_notify_worker_url not in vault; helpdesk_notify_worker not scheduled.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'helpdesk_notify_worker',
    '*/15 * * * *',
    format(
      $job$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-scheduler-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'helpdesk_scheduler_secret')),
        body := '{}'::jsonb);$job$,
      v_url
    )
  );
END;
$$;
