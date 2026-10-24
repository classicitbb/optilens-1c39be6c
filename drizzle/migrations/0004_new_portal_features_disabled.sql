-- New portal logins opt in to every workflow. Existing profiles and their
-- inherited/explicit settings are deliberately untouched (no backfill).
CREATE OR REPLACE FUNCTION public.initialize_portal_feature_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.customer_portal_feature_overrides (user_id, feature_key, enabled)
  SELECT NEW.user_id, feature_key, false
  FROM unnest(ARRAY[
    'quotes', 'helpdesk', 'pricelists', 'private-orders', 'live-order-status',
    'statements', 'order-prices', 'rx-order', 'auto-notifications'
  ]::text[]) AS defaults(feature_key)
  ON CONFLICT (user_id, feature_key) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Internal trigger only; no callable Data API endpoint.
REVOKE ALL ON FUNCTION public.initialize_portal_feature_defaults() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER initialize_portal_feature_defaults_after_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.initialize_portal_feature_defaults();