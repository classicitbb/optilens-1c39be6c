-- CV-initiated sync requests. The cloud cannot call into the office (outbound-only
-- architecture), so the "Sync now" button queues a request here; the OptiLens Local
-- agent claims and runs it on its next check, then writes the result back.

CREATE TABLE IF NOT EXISTS public.innovations_sync_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entities text[] NOT NULL DEFAULT ARRAY['customers','contacts'],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','done','failed')),
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  finished_at timestamptz,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.innovations_sync_requests ENABLE ROW LEVEL SECURITY;

-- Admins (in the browser) can create requests and read status.
CREATE POLICY "Admins manage innovations_sync_requests"
  ON public.innovations_sync_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- The office agent reaches this table via the edge function (service role), which
-- bypasses RLS — no separate grant needed.

CREATE INDEX IF NOT EXISTS idx_innovations_sync_requests_status
  ON public.innovations_sync_requests (status, requested_at);
