
ALTER TABLE public.innovations_sync_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage innovations_sync_requests" ON public.innovations_sync_requests;
CREATE POLICY "Admins manage innovations_sync_requests"
  ON public.innovations_sync_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
