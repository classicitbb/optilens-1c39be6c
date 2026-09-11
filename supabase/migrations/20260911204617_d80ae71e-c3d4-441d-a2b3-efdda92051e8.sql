CREATE OR REPLACE FUNCTION public.disable_gatekeeper_route_on_environment_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.environment IS DISTINCT FROM OLD.environment THEN
    NEW.enabled := false;
    NEW.status_poll_enabled := false;
    NEW.status_pull_failure_count := 0;
    NEW.status_pull_next_attempt_at := NULL;
    NEW.status_poll_degraded_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.disable_gatekeeper_route_on_environment_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS gatekeeper_settings_disable_route_on_environment_change
  ON public.gatekeeper_settings;
CREATE TRIGGER gatekeeper_settings_disable_route_on_environment_change
BEFORE UPDATE OF environment ON public.gatekeeper_settings
FOR EACH ROW
EXECUTE FUNCTION public.disable_gatekeeper_route_on_environment_change();