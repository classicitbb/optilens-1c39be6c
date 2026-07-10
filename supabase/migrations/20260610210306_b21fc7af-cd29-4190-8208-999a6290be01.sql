
-- Tighten RLS: remove customer-role visibility on staff-only tables

-- admin_notifications: staff only (edit roles)
DROP POLICY IF EXISTS "Staff can read admin notifications" ON public.admin_notifications;
CREATE POLICY "Staff can read admin notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- audit_log: edit roles only
DROP POLICY IF EXISTS "Role users can select audit_log" ON public.audit_log;
CREATE POLICY "Staff can select audit_log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- customers: edit roles only
DROP POLICY IF EXISTS "Role users can select customers" ON public.customers;
CREATE POLICY "Staff can select customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- pricing_settings: edit roles only
DROP POLICY IF EXISTS "Role users can select pricing_settings" ON public.pricing_settings;
CREATE POLICY "Staff can select pricing_settings"
  ON public.pricing_settings FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- quote_lines: drop the role-users policy; staff and customer-scoped policies remain
DROP POLICY IF EXISTS "Role users can select quote_lines" ON public.quote_lines;

-- shipments / shipment_lines / shipment_charges: edit roles only
DROP POLICY IF EXISTS "Role users can select shipments" ON public.shipments;
CREATE POLICY "Staff can select shipments"
  ON public.shipments FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select shipment_lines" ON public.shipment_lines;
CREATE POLICY "Staff can select shipment_lines"
  ON public.shipment_lines FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select shipment_charges" ON public.shipment_charges;
CREATE POLICY "Staff can select shipment_charges"
  ON public.shipment_charges FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- website_analytics_sessions: remove unrestricted public UPDATE.
-- Updates will be performed via the service role from edge functions / server code.
DROP POLICY IF EXISTS "Anon can update own session" ON public.website_analytics_sessions;
