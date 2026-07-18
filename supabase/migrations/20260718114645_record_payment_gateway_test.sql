-- Persist the outcome of the zero-impact payment gateway configuration test.
-- This lets a successful recheck clear a stale error badge without exposing
-- credentials or allowing direct writes from the browser.
CREATE OR REPLACE FUNCTION public.record_payment_gateway_test(
  p_success boolean,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
BEGIN
  IF NOT public.has_edit_role(v_actor) THEN
    RAISE EXCEPTION 'Only admins can record payment gateway test results.';
  END IF;

  UPDATE public.payment_gateway_settings
  SET
    status = CASE WHEN p_success THEN 'connected' ELSE 'error' END,
    last_tested_at = now(),
    updated_at = now()
  WHERE tenant_key = 'default' AND provider = 'scotia';
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_gateway_test(boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_gateway_test(boolean, uuid) TO authenticated;
