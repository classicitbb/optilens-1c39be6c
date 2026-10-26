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
  family_key jsonb NOT NULL CHECK (jsonb_typeof(family_key) = 'array' AND jsonb_array_length(family_key) = 5),
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

CREATE SCHEMA IF NOT EXISTS clearance_private;
REVOKE ALL ON SCHEMA clearance_private FROM PUBLIC;
GRANT USAGE ON SCHEMA clearance_private TO anon,authenticated;

CREATE FUNCTION clearance_private.validated_snapshot(p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE item jsonb; clean_items jsonb := '[]'::jsonb; single_vision boolean; source_time timestamptz; expiry timestamptz; field text;
BEGIN
  IF jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' OR p_snapshot->>'currency' IS DISTINCT FROM 'BBD'
     OR jsonb_typeof(p_snapshot->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_snapshot->'items') > 20000 THEN
    RAISE EXCEPTION 'Invalid clearance snapshot' USING ERRCODE='22023';
  END IF;
  source_time := (p_snapshot->>'asOf')::timestamptz;
  expiry := (p_snapshot->>'expiresAt')::timestamptz;
  IF source_time IS NULL OR expiry IS NULL OR source_time > now()+interval '5 minutes'
     OR expiry <= now() OR expiry <= source_time OR expiry > source_time+interval '24 hours' THEN
    RAISE EXCEPTION 'Invalid snapshot freshness' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_snapshot->'items') LOOP
    FOREACH field IN ARRAY ARRAY['name','material','manufacturer','family','design','option'] LOOP
      IF jsonb_typeof(item->field) IS DISTINCT FROM 'string' OR length(item->>field) NOT BETWEEN 1 AND 500 THEN
        RAISE EXCEPTION 'Invalid lens identity' USING ERRCODE='22023';
      END IF;
    END LOOP;
    single_vision := item->>'family' = 'Single Vision';
    IF NOT single_vision AND item->>'family' NOT IN ('Progressive','Bifocal','Trifocal','Double Segs') THEN
      RAISE EXCEPTION 'Unsupported lens family' USING ERRCODE='22023';
    END IF;
    IF item->>'unit' IS DISTINCT FROM (CASE WHEN single_vision THEN 'each' ELSE 'pairs' END)
       OR item->>'verticalAxis' IS DISTINCT FROM (CASE WHEN single_vision THEN 'Sphere' ELSE 'Base curve' END)
       OR item->>'horizontalAxis' IS DISTINCT FROM (CASE WHEN single_vision THEN 'Cylinder' ELSE 'Add' END) THEN
      RAISE EXCEPTION 'Invalid sale unit' USING ERRCODE='22023';
    END IF;
    FOREACH field IN ARRAY ARRAY['quantity','priceBbd','diameter','base','addPower'] LOOP
      IF jsonb_typeof(item->field) IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'Invalid optical value' USING ERRCODE='22023';
      END IF;
    END LOOP;
    IF (item->>'quantity')::numeric <= 0 OR trunc((item->>'quantity')::numeric) <> (item->>'quantity')::numeric
       OR (item->>'quantity')::numeric > 9007199254740991 OR (item->>'priceBbd')::numeric <= 0
       OR round((item->>'priceBbd')::numeric,2) <> (item->>'priceBbd')::numeric OR (item->>'diameter')::numeric <= 0 THEN
      RAISE EXCEPTION 'Invalid sale quantity or price' USING ERRCODE='22023';
    END IF;
    clean_items := clean_items || jsonb_build_array(jsonb_build_object(
      'sku',left(COALESCE(item->>'sku',''),500),'skuRight',left(COALESCE(item->>'skuRight',''),500),
      'skuLeft',left(COALESCE(item->>'skuLeft',''),500),'description',left(COALESCE(item->>'description',''),500),
      'name',item->'name','material',item->'material','manufacturer',item->'manufacturer','family',item->'family',
      'design',item->'design','option',item->'option','diameter',item->'diameter','base',item->'base',
      'addPower',item->'addPower','verticalAxis',item->'verticalAxis','horizontalAxis',item->'horizontalAxis',
      'unit',item->'unit','quantity',item->'quantity','priceBbd',item->'priceBbd'));
  END LOOP;
  RETURN jsonb_build_object('currency','BBD','asOf',p_snapshot->'asOf','expiresAt',p_snapshot->'expiresAt','items',clean_items);
END;
$$;
REVOKE ALL ON FUNCTION clearance_private.validated_snapshot(jsonb) FROM PUBLIC,anon,authenticated;

-- Elevated implementations are in an unexposed schema. Public RPC wrappers are invokers.
-- Link reads intentionally use a high-entropy capability instead of an account login.
CREATE FUNCTION clearance_private.read_snapshot(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE hash text; snapshot jsonb; visible_items jsonb;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN NULL; END IF;
  hash := encode(extensions.digest(p_token,'sha256'),'hex');
  SELECT s.snapshot INTO snapshot FROM public.clearance_catalogue_snapshots s
    WHERE s.token_hash=hash AND s.is_active AND s.expires_at>now();
  IF snapshot IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(item),'[]'::jsonb) INTO visible_items
    FROM jsonb_array_elements(snapshot->'items') item
    WHERE NOT EXISTS(SELECT 1 FROM public.clearance_catalogue_exclusions e WHERE e.token_hash=hash AND e.disabled
      AND e.family_key=jsonb_build_array(item->'material',item->'manufacturer',item->'design',item->'option',item->'family'));
  RETURN jsonb_set(snapshot,'{items}',visible_items);
END;
$$;

CREATE FUNCTION clearance_private.publish_snapshot(p_api_key text,p_token_hash text,p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE permissions text[]; clean jsonb; accepted boolean;
BEGIN
  IF p_api_key IS NULL OR length(p_api_key)>1000 OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid publication credentials' USING ERRCODE='42501';
  END IF;
  SELECT k.scopes INTO permissions FROM public.verify_api_key(p_api_key) k LIMIT 1;
  IF permissions IS NULL OR NOT ('catalog:write'=ANY(permissions)) THEN
    RAISE EXCEPTION 'Invalid publication authority' USING ERRCODE='42501';
  END IF;
  clean := clearance_private.validated_snapshot(p_snapshot);
  accepted := public.publish_clearance_catalogue(p_token_hash,clean);
  IF NOT accepted THEN RAISE EXCEPTION 'Link revoked or snapshot older than current publication' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('ok',true,'asOf',clean->'asOf','items',jsonb_array_length(clean->'items'));
END;
$$;

CREATE TABLE public.clearance_catalogue_visibility_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL REFERENCES public.clearance_catalogue_snapshots(token_hash),
  family_key jsonb NOT NULL,disabled boolean NOT NULL,actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clearance_catalogue_visibility_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clearance_catalogue_visibility_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.clearance_catalogue_visibility_events TO service_role;

CREATE FUNCTION clearance_private.manage_snapshot(p_token text,p_action text,p_family_key jsonb DEFAULT NULL,p_disabled boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE hash text; snapshot jsonb; selected_key jsonb; actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT public.has_role(actor,'admin') THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
  END IF;
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN NULL; END IF;
  hash := encode(extensions.digest(p_token,'sha256'),'hex');
  SELECT s.snapshot INTO snapshot FROM public.clearance_catalogue_snapshots s WHERE s.token_hash=hash;
  IF snapshot IS NULL THEN RETURN NULL; END IF;
  IF p_action='set-visibility' THEN
    IF p_disabled IS NULL OR p_family_key IS NULL OR jsonb_typeof(p_family_key)<>'array' OR jsonb_array_length(p_family_key)<>5 THEN
      RAISE EXCEPTION 'Invalid family selection' USING ERRCODE='22023';
    END IF;
    SELECT jsonb_build_array(i->'material',i->'manufacturer',i->'design',i->'option',i->'family') INTO selected_key
      FROM jsonb_array_elements(snapshot->'items') i
      WHERE jsonb_build_array(i->'material',i->'manufacturer',i->'design',i->'option',i->'family')=p_family_key LIMIT 1;
    IF selected_key IS NULL THEN RAISE EXCEPTION 'Unknown clearance family' USING ERRCODE='22023'; END IF;
    INSERT INTO public.clearance_catalogue_exclusions(token_hash,family_key,disabled,updated_by)
      VALUES(hash,selected_key,p_disabled,actor)
      ON CONFLICT(token_hash,family_key) DO UPDATE SET disabled=excluded.disabled,updated_by=excluded.updated_by,updated_at=now();
    INSERT INTO public.clearance_catalogue_visibility_events(token_hash,family_key,disabled,actor_id)
      VALUES(hash,selected_key,p_disabled,actor);
    RETURN jsonb_build_object('ok',true);
  ELSIF p_action='revoke' THEN
    UPDATE public.clearance_catalogue_snapshots SET is_active=false,updated_at=now() WHERE token_hash=hash;
    RETURN jsonb_build_object('ok',true);
  ELSIF p_action<>'admin-list' THEN
    RAISE EXCEPTION 'Unsupported action' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('snapshot',snapshot,'disabled',COALESCE(
    (SELECT jsonb_agg(e.family_key) FROM public.clearance_catalogue_exclusions e WHERE e.token_hash=hash AND e.disabled),'[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION clearance_private.read_snapshot(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION clearance_private.publish_snapshot(text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION clearance_private.manage_snapshot(text,text,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clearance_private.read_snapshot(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION clearance_private.publish_snapshot(text,text,jsonb) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION clearance_private.manage_snapshot(text,text,jsonb,boolean) TO authenticated;

CREATE FUNCTION public.clearance_read(p_token text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=''
  AS $$SELECT clearance_private.read_snapshot(p_token)$$;
CREATE FUNCTION public.clearance_publish_authorized(p_api_key text,p_token_hash text,p_snapshot jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=''
  AS $$SELECT clearance_private.publish_snapshot(p_api_key,p_token_hash,p_snapshot)$$;
CREATE FUNCTION public.clearance_manage(p_token text,p_action text,p_family_key jsonb DEFAULT NULL,p_disabled boolean DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=''
  AS $$SELECT clearance_private.manage_snapshot(p_token,p_action,p_family_key,p_disabled)$$;
REVOKE ALL ON FUNCTION public.clearance_read(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clearance_publish_authorized(text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clearance_manage(text,text,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.clearance_read(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clearance_publish_authorized(text,text,jsonb) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.clearance_manage(text,text,jsonb,boolean) TO authenticated;
