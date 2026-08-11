DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(portal_access_status, 'pending_profile') = 'pending_profile'
    AND crm_customer_id IS NULL
    AND crm_contact_id IS NULL
  );