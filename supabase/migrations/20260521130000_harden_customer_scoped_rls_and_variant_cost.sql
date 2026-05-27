-- Final RLS hardening for customer-scoped records and public variant cost exposure.

-- Helpdesk ticket events: staff can see all events; customers can only see
-- events for helpdesk tickets they are authorized to access.
DROP POLICY IF EXISTS "Authenticated users can view helpdesk ticket events" ON public.helpdesk_ticket_events;
DROP POLICY IF EXISTS "Users can read authorized helpdesk ticket events" ON public.helpdesk_ticket_events;
DROP POLICY IF EXISTS "Staff can view all helpdesk ticket events" ON public.helpdesk_ticket_events;
DROP POLICY IF EXISTS "Customers can view own helpdesk ticket events" ON public.helpdesk_ticket_events;

CREATE POLICY "Staff can view all helpdesk ticket events"
  ON public.helpdesk_ticket_events
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

CREATE POLICY "Customers can view own helpdesk ticket events"
  ON public.helpdesk_ticket_events
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer_portal_feature(auth.uid(), 'helpdesk')
    AND EXISTS (
      SELECT 1
      FROM public.helpdesk_tickets t
      WHERE t.id = helpdesk_ticket_events.ticket_id
        AND (
          t.owner_user_id = auth.uid()
          OR t.partner_contact_id IN (
            SELECT p.crm_contact_id
            FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND p.crm_contact_id IS NOT NULL
          )
        )
    )
  );

-- Rx details: remove the role-wide SELECT and scope non-staff reads through
-- quote_lines -> quotes so customers can only see prescriptions on their own quotes.
DROP POLICY IF EXISTS "Role users can select rx_details" ON public.rx_details;
DROP POLICY IF EXISTS "Staff can view all rx details" ON public.rx_details;
DROP POLICY IF EXISTS "Customers can view own rx details" ON public.rx_details;

CREATE POLICY "Staff can view all rx details"
  ON public.rx_details
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

CREATE POLICY "Customers can view own rx details"
  ON public.rx_details
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    AND EXISTS (
      SELECT 1
      FROM public.quote_lines ql
      JOIN public.quotes q ON q.id = ql.quote_id
      WHERE ql.id = rx_details.quote_line_id
        AND q.created_by = auth.uid()
    )
  );

-- Store variants are row-public when active, but cost must not be readable by
-- browser roles. Use column grants so public SELECT remains useful without cost.
REVOKE SELECT ON public.store_product_variants FROM anon, authenticated;
GRANT SELECT (
  id,
  product_type,
  product_id,
  title,
  variant_key,
  sku,
  opc_code,
  attributes,
  metadata,
  price,
  stock_qty,
  reserved_qty,
  low_stock_threshold,
  allow_backorder,
  is_active,
  sort_order,
  created_by,
  updated_by,
  created_at,
  updated_at
) ON public.store_product_variants TO anon, authenticated;
REVOKE SELECT (cost) ON public.store_product_variants FROM anon, authenticated;

-- Analytics sessions must not have a broad visitor UPDATE path. Session
-- mutation is handled by the token-checked upsert_website_analytics_session RPC.
DROP POLICY IF EXISTS website_analytics_sessions_update_public ON public.website_analytics_sessions;
REVOKE UPDATE ON public.website_analytics_sessions FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
