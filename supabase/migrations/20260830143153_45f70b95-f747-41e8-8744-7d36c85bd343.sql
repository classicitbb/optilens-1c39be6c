CREATE TABLE public.scotia_gateway_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('prepare','return','notify','probe')),
  oid text,
  store_id text,
  env text,
  outcome text NOT NULL CHECK (outcome IN ('ok','hash_invalid','declined','error')),
  approved boolean,
  fail_rc text,
  fail_reason text,
  approval_code text,
  association_response_code text,
  terminal_id text,
  endpoint_url text,
  http_status integer,
  request_params jsonb,
  response_params jsonb,
  notes text
);

CREATE INDEX idx_scotia_gateway_events_created_at ON public.scotia_gateway_events (created_at DESC);
CREATE INDEX idx_scotia_gateway_events_oid ON public.scotia_gateway_events (oid);

GRANT SELECT ON public.scotia_gateway_events TO authenticated;
GRANT ALL ON public.scotia_gateway_events TO service_role;

ALTER TABLE public.scotia_gateway_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view scotia gateway events"
ON public.scotia_gateway_events
FOR SELECT
TO authenticated
USING (public.has_staff_role(auth.uid()));