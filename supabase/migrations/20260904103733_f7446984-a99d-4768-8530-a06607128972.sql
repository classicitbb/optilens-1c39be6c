DROP POLICY IF EXISTS "Customers create own portal quotes" ON public.quotes;
CREATE POLICY "Customers create own portal quotes"
ON public.quotes FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
    OR public.can_access_customer_portal_feature(auth.uid(), 'quotes')
  )
  AND (account_id IS NULL OR public.can_access_portal_account(account_id, auth.uid()))
);

DROP POLICY IF EXISTS "Customers read own rx quotes" ON public.quotes;
CREATE POLICY "Customers read own rx quotes"
ON public.quotes FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  AND (
    public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
    OR public.can_access_customer_portal_feature(auth.uid(), 'quotes')
  )
);

DROP POLICY IF EXISTS "Customers update own portal quotes" ON public.quotes;
CREATE POLICY "Customers update own portal quotes"
ON public.quotes FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND (
    public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
    OR public.can_access_customer_portal_feature(auth.uid(), 'quotes')
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND (account_id IS NULL OR public.can_access_portal_account(account_id, auth.uid()))
);