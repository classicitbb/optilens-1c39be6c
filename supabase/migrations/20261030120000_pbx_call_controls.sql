-- Live call panel for website click-to-call (follows 20261024120000_pbx_calls.sql).
--
-- The LAN agent now reports what happens after it starts a call (staff phone
-- ringing, customer being dialled, connected, ended) and carries out Hang up /
-- Record / Stop recording buttons pressed in the contact's Calls tab. Staff
-- write a control through pbx-calls; the agent picks it up on its next poll.
--
-- Writes still go through the service role only. Apply via the Lovable SQL editor.

ALTER TABLE public.call_requests DROP CONSTRAINT IF EXISTS call_requests_status_check;
ALTER TABLE public.call_requests
  ADD CONSTRAINT call_requests_status_check
  CHECK (status IN ('requested', 'dialing', 'ringing', 'calling', 'connected', 'ended', 'failed'));

ALTER TABLE public.call_requests
  ADD COLUMN IF NOT EXISTS recording boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS control text CHECK (control IN ('hangup', 'record', 'stop-record')),
  ADD COLUMN IF NOT EXISTS connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS call_requests_active_idx ON public.call_requests (requested_by)
  WHERE status IN ('requested', 'dialing', 'ringing', 'calling', 'connected');
