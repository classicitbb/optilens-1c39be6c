-- No anonymous/authenticated table access: the link-checked function is the only reader.
CREATE TABLE public.clearance_catalogue_snapshots (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object' AND snapshot->>'currency' = 'BBD'),
  source_as_of timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > source_as_of AND expires_at <= source_as_of + interval '24 hours')
);
ALTER TABLE public.clearance_catalogue_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clearance_catalogue_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.clearance_catalogue_snapshots TO service_role;

CREATE FUNCTION public.publish_clearance_catalogue(p_token_hash text, p_snapshot jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE affected integer;
BEGIN
  INSERT INTO public.clearance_catalogue_snapshots(token_hash,snapshot,source_as_of,expires_at)
  VALUES(p_token_hash,p_snapshot,(p_snapshot->>'asOf')::timestamptz,(p_snapshot->>'expiresAt')::timestamptz)
  ON CONFLICT(token_hash) DO UPDATE
    SET snapshot=excluded.snapshot,source_as_of=excluded.source_as_of,
        expires_at=excluded.expires_at,updated_at=now()
    WHERE public.clearance_catalogue_snapshots.is_active
      AND excluded.source_as_of >= public.clearance_catalogue_snapshots.source_as_of;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_clearance_catalogue(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_clearance_catalogue(text,jsonb) TO service_role;
COMMENT ON TABLE public.clearance_catalogue_snapshots IS
  'Sale-only snapshots; SHA-256 capability-link token; no inventory cost data. Revocation survives subsequent publishes.';

CREATE TABLE public.clearance_catalogue_exclusions (
  token_hash text NOT NULL REFERENCES public.clearance_catalogue_snapshots(token_hash),
  family_key text NOT NULL CHECK (length(family_key) <= 3000),
  disabled boolean NOT NULL DEFAULT true,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(token_hash,family_key)
);
ALTER TABLE public.clearance_catalogue_exclusions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clearance_catalogue_exclusions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.clearance_catalogue_exclusions TO service_role;
COMMENT ON TABLE public.clearance_catalogue_exclusions IS
  'Admin-only sale-family visibility overlay; survives source snapshot refresh and never writes inventory.';
