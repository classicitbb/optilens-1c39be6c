ALTER TABLE public.rx_order_submissions
  ADD COLUMN IF NOT EXISTS lab_status text,
  ADD COLUMN IF NOT EXISTS lab_status_detail text,
  ADD COLUMN IF NOT EXISTS lab_status_at timestamptz;

ALTER TABLE public.stock_order_submissions
  ADD COLUMN IF NOT EXISTS lab_status text,
  ADD COLUMN IF NOT EXISTS lab_status_detail text,
  ADD COLUMN IF NOT EXISTS lab_status_at timestamptz;

ALTER TABLE public.gatekeeper_settings
  ADD COLUMN IF NOT EXISTS last_status_pull_at timestamptz;

-- Throttle gate: returns TRUE (and claims the window) only when the last
-- Gatekeeper status pull was more than 5 minutes ago. Gatekeeper's spec
-- forbids pulling job statuses more often than that, so the limit is enforced
-- in the database rather than trusting the caller or the schedule.
CREATE OR REPLACE FUNCTION public.begin_gatekeeper_status_pull(p_force boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  UPDATE public.gatekeeper_settings
     SET last_status_pull_at = now(),
         updated_at = now()
   WHERE tenant_key = 'default'
     AND (p_force OR last_status_pull_at IS NULL OR last_status_pull_at < now() - interval '5 minutes')
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.begin_gatekeeper_status_pull(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_gatekeeper_status_pull(boolean) TO service_role;

-- Persist one order's latest lab status from a Gatekeeper status pull.
CREATE OR REPLACE FUNCTION public.record_gatekeeper_status(
  p_submission_id uuid,
  p_order_kind text,
  p_status text,
  p_detail text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_order_kind = 'stock' THEN
    UPDATE public.stock_order_submissions
       SET lab_status = p_status,
           lab_status_detail = p_detail,
           lab_status_at = now(),
           updated_at = now()
     WHERE id = p_submission_id;
  ELSE
    UPDATE public.rx_order_submissions
       SET lab_status = p_status,
           lab_status_detail = p_detail,
           lab_status_at = now(),
           updated_at = now()
     WHERE id = p_submission_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_gatekeeper_status(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_gatekeeper_status(uuid, text, text, text) TO service_role;