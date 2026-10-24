-- FreePBX click-to-call and selective call recording.
--
-- The website never talks to the PBX directly (it sits on the office LAN). Staff
-- clicking Call insert a row into call_requests through the pbx-calls edge
-- function; a small agent on the LAN claims it through pbx-agent and tells
-- FreePBX to ring the staff member's extension and then dial the customer.
-- The same agent uploads recordings that staff chose to make (FreePBX on-demand
-- recording) to the private call-recordings bucket; pbx-agent then links them to
-- the contact, writes a CRM activity and stores a transcript.
--
-- All writes go through the service role. RLS is on, with read policies only.
-- Apply via the Lovable SQL editor.

CREATE TABLE IF NOT EXISTS public.staff_extensions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  extension text NOT NULL UNIQUE CHECK (extension ~ '^[0-9]{2,8}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff_extensions" ON public.staff_extensions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own staff_extension" ON public.staff_extensions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.call_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  extension text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'dialing', 'failed')),
  error text,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_requests_pending_idx ON public.call_requests (created_at) WHERE status = 'requested';
CREATE INDEX IF NOT EXISTS call_requests_contact_idx ON public.call_requests (contact_id, created_at DESC);
ALTER TABLE public.call_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Role users can select call_requests" ON public.call_requests
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_filename text NOT NULL UNIQUE,
  storage_path text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'unknown' CHECK (direction IN ('inbound', 'outbound', 'unknown')),
  extension text,
  remote_number text,
  recorded_at timestamptz NOT NULL,
  duration_seconds integer,
  transcript text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_recordings_contact_idx ON public.call_recordings (contact_id, recorded_at DESC);
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
-- Recordings and transcripts are sensitive customer data: editors and admins only.
CREATE POLICY "Editors can select call_recordings" ON public.call_recordings
  FOR SELECT TO authenticated USING (public.has_edit_role(auth.uid()));

-- Private bucket, no policies: only the service role (edge functions) can read or
-- write. Staff play recordings through short-lived signed URLs from pbx-calls.
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Candidate contacts for a phone number. contacts.phone is free text ("434-5678",
-- "+1 (246) 434 5678"), so compare digits only; the edge function narrows the
-- candidates further. Service role only.
CREATE OR REPLACE FUNCTION public.contact_ids_by_phone(p_last7 text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.contacts
  WHERE NOT is_archived
    AND length(p_last7) = 7
    AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') LIKE '%' || p_last7 || '%'
  LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.contact_ids_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contact_ids_by_phone(text) TO service_role;
