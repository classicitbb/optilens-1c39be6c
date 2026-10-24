-- Drafts (Rx order + cart) become visible to everyone on the customer account
-- they were started for, each tagged with who started it.
--   customer_id     — account the draft belongs to (the starter's active account)
--   created_by_name — snapshot of the starter's display name, shown on the
--                     Saved Drafts page; user_id stays the starter's login.

ALTER TABLE public.rx_order_drafts
  ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name text;
ALTER TABLE public.cart_drafts
  ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name text;

CREATE INDEX IF NOT EXISTS rx_order_drafts_customer_idx ON public.rx_order_drafts (customer_id);
CREATE INDEX IF NOT EXISTS cart_drafts_customer_idx ON public.cart_drafts (customer_id);

CREATE OR REPLACE FUNCTION public.draft_person_name(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(btrim(p.full_name), ''), NULLIF(btrim(p.display_name), ''), split_part(p.email, '@', 1))
  FROM public.profiles p WHERE p.user_id = p_user_id LIMIT 1
$$;

-- Active membership on the account; viewers can read but not change.
CREATE OR REPLACE FUNCTION public.can_access_account_draft(p_customer_id integer, p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_customer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.portal_account_memberships m
    WHERE m.user_id = auth.uid() AND m.customer_id = p_customer_id AND m.status = 'active'
      AND (NOT p_write OR m.access_role <> 'viewer')
  )
$$;

-- Stamp the starter on insert; default the account to their default membership.
CREATE OR REPLACE FUNCTION public.stamp_draft_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    SELECT m.customer_id INTO NEW.customer_id FROM public.portal_account_memberships m
    WHERE m.user_id = NEW.user_id AND m.status = 'active'
    ORDER BY m.is_default DESC, m.created_at LIMIT 1;
  END IF;
  NEW.created_by_name := COALESCE(NEW.created_by_name, public.draft_person_name(NEW.user_id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS stamp_draft_owner ON public.rx_order_drafts;
CREATE TRIGGER stamp_draft_owner BEFORE INSERT ON public.rx_order_drafts
  FOR EACH ROW EXECUTE FUNCTION public.stamp_draft_owner();
DROP TRIGGER IF EXISTS stamp_draft_owner ON public.cart_drafts;
CREATE TRIGGER stamp_draft_owner BEFORE INSERT ON public.cart_drafts
  FOR EACH ROW EXECUTE FUNCTION public.stamp_draft_owner();

-- Backfill existing drafts.
UPDATE public.rx_order_drafts d SET
  customer_id = COALESCE(d.customer_id, (SELECT m.customer_id FROM public.portal_account_memberships m
    WHERE m.user_id = d.user_id AND m.status = 'active' ORDER BY m.is_default DESC, m.created_at LIMIT 1)),
  created_by_name = COALESCE(d.created_by_name, public.draft_person_name(d.user_id));
UPDATE public.cart_drafts d SET
  customer_id = COALESCE(d.customer_id, (SELECT m.customer_id FROM public.portal_account_memberships m
    WHERE m.user_id = d.user_id AND m.status = 'active' ORDER BY m.is_default DESC, m.created_at LIMIT 1)),
  created_by_name = COALESCE(d.created_by_name, public.draft_person_name(d.user_id));

-- Policies: own drafts as before, plus the whole account's.
DROP POLICY IF EXISTS "Customers manage their own Rx drafts" ON public.rx_order_drafts;
CREATE POLICY "Rx drafts: read own or account" ON public.rx_order_drafts FOR SELECT
  USING (auth.uid() = user_id OR public.can_access_account_draft(customer_id, false));
CREATE POLICY "Rx drafts: insert own" ON public.rx_order_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (customer_id IS NULL OR public.can_access_account_draft(customer_id, true)));
CREATE POLICY "Rx drafts: update own or account" ON public.rx_order_drafts FOR UPDATE
  USING (auth.uid() = user_id OR public.can_access_account_draft(customer_id, true))
  WITH CHECK (auth.uid() = user_id OR public.can_access_account_draft(customer_id, true));
CREATE POLICY "Rx drafts: delete own or account" ON public.rx_order_drafts FOR DELETE
  USING (auth.uid() = user_id OR public.can_access_account_draft(customer_id, true));

DROP POLICY IF EXISTS "Users can view their own cart drafts" ON public.cart_drafts;
DROP POLICY IF EXISTS "Users can create their own cart drafts" ON public.cart_drafts;
DROP POLICY IF EXISTS "Users can update their own cart drafts" ON public.cart_drafts;
DROP POLICY IF EXISTS "Users can delete their own cart drafts" ON public.cart_drafts;
CREATE POLICY "Cart drafts: read own or account" ON public.cart_drafts FOR SELECT
  USING (auth.uid() = user_id OR public.can_access_account_draft(customer_id, false));
CREATE POLICY "Cart drafts: insert own" ON public.cart_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (customer_id IS NULL OR public.can_access_account_draft(customer_id, true)));
CREATE POLICY "Cart drafts: update own or account" ON public.cart_drafts FOR UPDATE
  USING (auth.uid() = user_id OR public.can_access_account_draft(customer_id, true))
  WITH CHECK (auth.uid() = user_id OR public.can_access_account_draft(customer_id, true));
CREATE POLICY "Cart drafts: delete own or account" ON public.cart_drafts FOR DELETE
  USING (auth.uid() = user_id OR public.can_access_account_draft(customer_id, true));
