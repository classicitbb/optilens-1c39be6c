-- Live-data gateway diagnostics: let staff read the OptiLens Local connector's
-- heartbeat/last error, and record every gateway request (action, response
-- code, latency) so the admin Edge Function Status page can surface both.

-- live_data_gateway_agents was created service-role-only (REVOKE ALL FROM
-- anon, authenticated). Restore SELECT so the staff-only RLS policy below can
-- actually apply.
GRANT SELECT ON public.live_data_gateway_agents TO authenticated;

DROP POLICY IF EXISTS "Staff can read live data gateway agents" ON public.live_data_gateway_agents;
CREATE POLICY "Staff can read live data gateway agents"
  ON public.live_data_gateway_agents FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.live_data_gateway_request_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action text NOT NULL,
  operation text,
  status_code integer NOT NULL,
  latency_ms integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_data_gateway_request_log_created_at_idx
  ON public.live_data_gateway_request_log (created_at DESC);

ALTER TABLE public.live_data_gateway_request_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read live data gateway request log" ON public.live_data_gateway_request_log;
CREATE POLICY "Staff can read live data gateway request log"
  ON public.live_data_gateway_request_log FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

ALTER TABLE public.live_data_gateway_agents REPLICA IDENTITY FULL;
ALTER TABLE public.live_data_gateway_request_log REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_data_gateway_agents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_data_gateway_agents;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_data_gateway_request_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_data_gateway_request_log;
  END IF;
END;
$$;
