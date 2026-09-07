-- Customer support images remain private: the ticket participant/staff policy
-- applies to both metadata and the underlying Storage object.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('helpdesk-attachments', 'helpdesk-attachments', false, 10485760, ARRAY['image/png','image/jpeg','image/gif','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.helpdesk_ticket_messages(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/gif','image/webp')),
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  storage_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS helpdesk_ticket_attachments_ticket_created_idx ON public.helpdesk_ticket_attachments(ticket_id, created_at);
ALTER TABLE public.helpdesk_ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_helpdesk_ticket(p_ticket_id uuid, p_user_id uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_user_id IS NOT NULL AND (public.has_edit_role(p_user_id) OR (public.can_access_customer_portal_feature(p_user_id, 'helpdesk') AND EXISTS (SELECT 1 FROM public.helpdesk_tickets t WHERE t.id = p_ticket_id AND (t.owner_user_id = p_user_id OR t.partner_contact_id IN (SELECT p.crm_contact_id FROM public.profiles p WHERE p.user_id = p_user_id AND p.crm_contact_id IS NOT NULL)))));
$$;
REVOKE ALL ON FUNCTION public.can_access_helpdesk_ticket(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_helpdesk_ticket(uuid, uuid) TO authenticated;
DROP POLICY IF EXISTS "Helpdesk participants view attachments" ON public.helpdesk_ticket_attachments;
CREATE POLICY "Helpdesk participants view attachments" ON public.helpdesk_ticket_attachments FOR SELECT TO authenticated USING (public.can_access_helpdesk_ticket(ticket_id));
DROP POLICY IF EXISTS "Helpdesk participants add their attachments" ON public.helpdesk_ticket_attachments;
CREATE POLICY "Helpdesk participants add their attachments" ON public.helpdesk_ticket_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by_user_id = (select auth.uid()) AND public.can_access_helpdesk_ticket(ticket_id) AND (message_id IS NULL OR EXISTS (SELECT 1 FROM public.helpdesk_ticket_messages m WHERE m.id = message_id AND m.ticket_id = ticket_id)));

DROP POLICY IF EXISTS "Helpdesk attachment image upload" ON storage.objects;
CREATE POLICY "Helpdesk attachment image upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'helpdesk-attachments' AND (storage.foldername(name))[2] = (select auth.uid()::text));
DROP POLICY IF EXISTS "Helpdesk attachment image read" ON storage.objects;
CREATE POLICY "Helpdesk attachment image read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'helpdesk-attachments' AND EXISTS (SELECT 1 FROM public.helpdesk_ticket_attachments a WHERE a.storage_path = name AND public.can_access_helpdesk_ticket(a.ticket_id)));
DROP POLICY IF EXISTS "Helpdesk attachment image owner cleanup" ON storage.objects;
CREATE POLICY "Helpdesk attachment image owner cleanup" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'helpdesk-attachments' AND (storage.foldername(name))[2] = (select auth.uid()::text));

NOTIFY pgrst, 'reload schema';
