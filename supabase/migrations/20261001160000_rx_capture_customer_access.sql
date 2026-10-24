-- Rx capture, Phase 4d: a pilot customer can fill the portal Rx form from a photo.
--
-- Access is the same opt-in as the form itself: 'rx-order' (off unless enabled
-- per customer on the Portals page). A customer sees and writes only their OWN
-- capture jobs for an account they belong to, and only files under their own
-- user-id folder in the private bucket. Staff keep full access through the
-- policies of 20261001150000.

DROP POLICY IF EXISTS "Customers create own rx capture jobs" ON public.rx_capture_jobs;
CREATE POLICY "Customers create own rx capture jobs"
  ON public.rx_capture_jobs FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND source = 'web'
    AND public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
    AND account_id IS NOT NULL
    AND public.can_access_portal_account(account_id, auth.uid())
  );

DROP POLICY IF EXISTS "Customers read own rx capture jobs" ON public.rx_capture_jobs;
CREATE POLICY "Customers read own rx capture jobs"
  ON public.rx_capture_jobs FOR SELECT TO authenticated
  USING (created_by = auth.uid() AND public.can_access_customer_portal_feature(auth.uid(), 'rx-order'));

-- the form records which quote the capture became
DROP POLICY IF EXISTS "Customers link own rx capture jobs" ON public.rx_capture_jobs;
CREATE POLICY "Customers link own rx capture jobs"
  ON public.rx_capture_jobs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.can_access_customer_portal_feature(auth.uid(), 'rx-order'))
  WITH CHECK (created_by = auth.uid() AND public.can_access_customer_portal_feature(auth.uid(), 'rx-order'));

DROP POLICY IF EXISTS "Customers upload own rx captures" ON storage.objects;
CREATE POLICY "Customers upload own rx captures" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rx-captures'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
  );

DROP POLICY IF EXISTS "Customers read own rx captures" ON storage.objects;
CREATE POLICY "Customers read own rx captures" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rx-captures'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.can_access_customer_portal_feature(auth.uid(), 'rx-order')
  );
