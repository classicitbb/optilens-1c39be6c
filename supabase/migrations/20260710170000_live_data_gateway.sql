-- On-demand CV Web -> OptiLens Local live-data gateway.
-- Requests and responses are short lived, service-role only, and contain only
-- an allow-listed customer operation resolved by the edge function.

CREATE TABLE IF NOT EXISTS public.live_data_gateway_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_customer_id integer NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('innovations', 'optilens')),
  operation text NOT NULL CHECK (operation IN (
    'innovations.customer_account',
    'innovations.customer_statement',
    'optilens.customer_deliveries'
  )),
  target jsonb NOT NULL DEFAULT '{}'::jsonb,
  arguments jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'claimed', 'completed', 'failed', 'expired'
  )),
  claimed_by uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  response_payload jsonb,
  error_code text,
  error_message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 seconds'),
  purge_after timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

CREATE INDEX IF NOT EXISTS live_data_gateway_requests_pending_idx
  ON public.live_data_gateway_requests (status, requested_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS live_data_gateway_requests_requester_idx
  ON public.live_data_gateway_requests (requested_by, requested_at DESC);

ALTER TABLE public.live_data_gateway_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_data_gateway_requests FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.live_data_gateway_requests TO service_role;

CREATE TABLE IF NOT EXISTS public.live_data_gateway_agents (
  api_key_id uuid PRIMARY KEY REFERENCES public.api_keys(id) ON DELETE CASCADE,
  agent_name text NOT NULL DEFAULT 'OptiLens Local',
  agent_version text,
  capabilities text[] NOT NULL DEFAULT '{}',
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_error text
);

ALTER TABLE public.live_data_gateway_agents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_data_gateway_agents FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.live_data_gateway_agents TO service_role;

-- Atomically expire stale work and claim one request. SKIP LOCKED permits a
-- second office connector without ever running the same request twice.
CREATE OR REPLACE FUNCTION public.claim_live_data_gateway_request(p_agent_key_id uuid)
RETURNS TABLE (
  id uuid,
  source text,
  operation text,
  target jsonb,
  arguments jsonb,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_data_gateway_requests AS stale
  SET status = 'expired',
      error_code = 'request_expired',
      error_message = 'The live source did not answer before the request expired.',
      completed_at = now()
  WHERE stale.status IN ('pending', 'claimed')
    AND stale.expires_at <= now();

  RETURN QUERY
  WITH next_request AS (
    SELECT request_row.id
    FROM public.live_data_gateway_requests AS request_row
    WHERE request_row.status = 'pending'
      AND request_row.expires_at > now()
    ORDER BY request_row.requested_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.live_data_gateway_requests AS claimed
  SET status = 'claimed',
      claimed_by = p_agent_key_id,
      claimed_at = now()
  FROM next_request
  WHERE claimed.id = next_request.id
  RETURNING claimed.id, claimed.source, claimed.operation, claimed.target,
            claimed.arguments, claimed.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_live_data_gateway_request(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_data_gateway_request(uuid) TO service_role;
