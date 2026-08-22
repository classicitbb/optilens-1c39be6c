-- QuoteFormSection now writes account_id (previously always NULL from this
-- form) so a customer's quote requests can be scoped to the account active
-- in the switcher. Per src/features/portal-account-access/CONTEXT.md:
-- "Browser-selected customer IDs are preferences, never authorization" —
-- the RLS insert/update checks must verify it server-side, not just accept
-- whatever account_id the client sends.

DROP POLICY IF EXISTS "Users can insert authorized quotes" ON public.quotes;
CREATE POLICY "Users can insert authorized quotes"
  ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_edit_role(auth.uid())
    OR (
      created_by = auth.uid()
      AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
      AND (account_id IS NULL OR public.can_access_portal_account(account_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Customers manage own rx quotes" ON public.quotes;
CREATE POLICY "Customers manage own rx quotes"
  ON public.quotes FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.can_access_customer_portal_feature(auth.uid(), 'quotes'))
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_access_customer_portal_feature(auth.uid(), 'quotes')
    AND (account_id IS NULL OR public.can_access_portal_account(account_id, auth.uid()))
  );
