
-- Drop dependent policies first
DROP POLICY IF EXISTS "Users can read authorized quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert authorized quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can read authorized helpdesk tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Users can create authorized helpdesk tickets" ON public.helpdesk_tickets;

-- Now safe to drop the function
DROP FUNCTION IF EXISTS public.can_access_customer_portal_feature(uuid, text);

-- Recreate without PERFORM sync side-effect
CREATE FUNCTION public.can_access_customer_portal_feature(
  p_user_id uuid DEFAULT auth.uid(),
  p_feature_key text DEFAULT 'quotes'::text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Recreate the policies exactly as before
CREATE POLICY "Users can read authorized quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (has_edit_role(auth.uid()) OR ((created_by = auth.uid()) AND can_access_customer_portal_feature(auth.uid(), 'quotes'::text)));

CREATE POLICY "Users can insert authorized quotes" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()) OR ((created_by = auth.uid()) AND can_access_customer_portal_feature(auth.uid(), 'quotes'::text)));

CREATE POLICY "Users can read authorized helpdesk tickets" ON public.helpdesk_tickets
  FOR SELECT TO authenticated
  USING (has_edit_role(auth.uid()) OR (can_access_customer_portal_feature(auth.uid(), 'helpdesk'::text) AND ((owner_user_id = auth.uid()) OR (partner_contact_id IN (
    SELECT profiles.crm_contact_id FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.crm_contact_id IS NOT NULL
  )))));

CREATE POLICY "Users can create authorized helpdesk tickets" ON public.helpdesk_tickets
  FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()) OR (can_access_customer_portal_feature(auth.uid(), 'helpdesk'::text) AND (owner_user_id = auth.uid())));

-- Analytics session update restriction trigger
CREATE OR REPLACE FUNCTION public.restrict_analytics_session_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.visitor_id IS DISTINCT FROM OLD.visitor_id
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.landing_path IS DISTINCT FROM OLD.landing_path
     OR NEW.device_type IS DISTINCT FROM OLD.device_type
     OR NEW.referrer_host IS DISTINCT FROM OLD.referrer_host
     OR NEW.user_agent IS DISTINCT FROM OLD.user_agent
     OR NEW.is_returning_visitor IS DISTINCT FROM OLD.is_returning_visitor
  THEN
    RAISE EXCEPTION 'Cannot modify session identity fields';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_analytics_session_update ON public.website_analytics_sessions;

CREATE TRIGGER trg_restrict_analytics_session_update
  BEFORE UPDATE ON public.website_analytics_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_analytics_session_update();
